import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";
import type { Cursor } from "../shared/pagination.js";
import type { Booking, BookingStatus, IdempotencyRecord, Slot, SlotWithAvailability } from "../shared/types.js";
import { migratePostgres } from "./migrate.js";
import type { Store } from "./store.js";

type PoolClient = pg.PoolClient;
type Queryable = pg.Pool | pg.PoolClient;

type SlotRow = {
  id: string;
  provider: string;
  start: string;
  end_time: string;
  taken: string | number | bigint;
};

type BookingRow = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: BookingStatus;
  created_at: string;
};

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    slot_id: row.slot_id,
    name: row.name,
    email: row.email,
    status: row.status,
    created_at: row.created_at,
  };
}

export class PostgresStore implements Store {
  private readonly tx = new AsyncLocalStorage<PoolClient>();

  private constructor(private readonly pool: pg.Pool) {}

  static async connect(connectionString: string): Promise<PostgresStore> {
    const pool = new pg.Pool({ connectionString });
    const store = new PostgresStore(pool);
    await migratePostgres((sql, params) => pool.query(sql, params));
    return store;
  }

  private db(): Queryable {
    return this.tx.getStore() ?? this.pool;
  }

  async transact<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    return this.tx.run(client, async () => {
      try {
        await client.query("BEGIN");
        const result = await fn();
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore
        }
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async reset(slots: Slot[]): Promise<void> {
    await this.transact(async () => {
      const db = this.db();
      await db.query("DELETE FROM bookings");
      await db.query("DELETE FROM slots");
      await db.query("DELETE FROM idempotency_keys");
      await db.query("DELETE FROM rate_attempts");
      for (const slot of slots) {
        await db.query(`INSERT INTO slots (id, provider, start, "end") VALUES ($1, $2, $3, $4)`, [
          slot.id,
          slot.provider,
          slot.start,
          slot.end,
        ]);
      }
    });
  }

  async listSlots(provider?: string): Promise<SlotWithAvailability[]> {
    const sql = `SELECT s.id, s.provider, s.start, s."end" AS end_time,
                        CASE WHEN b.id IS NULL THEN 0 ELSE 1 END AS taken
                 FROM slots s
                 LEFT JOIN bookings b
                   ON b.slot_id = s.id AND b.status = 'confirmed'
                 ${provider ? "WHERE s.provider = $1" : ""}
                 ORDER BY s.start ASC, s.id ASC`;
    const result = provider ? await this.db().query(sql, [provider]) : await this.db().query(sql);
    return (result.rows as SlotRow[]).map((row) => ({
      id: row.id,
      provider: row.provider,
      start: row.start,
      end: row.end_time,
      available: Number(row.taken) === 0,
    }));
  }

  async getSlot(id: string): Promise<Slot | null> {
    const result = await this.db().query(
      `SELECT id, provider, start, "end" AS end_time FROM slots WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as Omit<SlotRow, "taken"> | undefined;
    if (!row) return null;
    return { id: row.id, provider: row.provider, start: row.start, end: row.end_time };
  }

  async slotCount(): Promise<number> {
    const result = await this.db().query("SELECT COUNT(*) AS n FROM slots");
    return Number(result.rows[0].n);
  }

  async getBooking(id: string): Promise<Booking | null> {
    const result = await this.db().query("SELECT * FROM bookings WHERE id = $1", [id]);
    const row = result.rows[0] as BookingRow | undefined;
    return row ? toBooking(row) : null;
  }

  async findConfirmedBooking(slotId: string): Promise<{ id: string } | null> {
    const result = await this.db().query(
      `SELECT id FROM bookings WHERE slot_id = $1 AND status = 'confirmed'`,
      [slotId]
    );
    return (result.rows[0] as { id: string } | undefined) ?? null;
  }

  async insertBooking(booking: Booking): Promise<void> {
    await this.db().query(
      `INSERT INTO bookings (id, slot_id, name, email, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [booking.id, booking.slot_id, booking.name, booking.email, booking.status, booking.created_at]
    );
  }

  async cancelBooking(id: string): Promise<void> {
    await this.db().query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [id]);
  }

  async listBookings(email: string, limitPlusOne: number, cursor?: Cursor): Promise<Booking[]> {
    const result = cursor
      ? await this.db().query(
          `SELECT * FROM bookings
           WHERE email = $1
             AND (created_at > $2 OR (created_at = $2 AND id > $3))
           ORDER BY created_at ASC, id ASC
           LIMIT $4`,
          [email, cursor.created_at, cursor.id, limitPlusOne]
        )
      : await this.db().query(
          `SELECT * FROM bookings
           WHERE email = $1
           ORDER BY created_at ASC, id ASC
           LIMIT $2`,
          [email, limitPlusOne]
        );
    return (result.rows as BookingRow[]).map(toBooking);
  }

  async getIdempotency(key: string): Promise<IdempotencyRecord | null> {
    const result = await this.db().query(
      "SELECT body_hash, status_code, response FROM idempotency_keys WHERE key = $1",
      [key]
    );
    return (result.rows[0] as IdempotencyRecord | undefined) ?? null;
  }

  async saveIdempotency(key: string, bodyHash: string, status: number, body: unknown): Promise<void> {
    await this.db().query(
      `INSERT INTO idempotency_keys (key, body_hash, status_code, response)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING`,
      [key, bodyHash, status, JSON.stringify(body)]
    );
  }

  async countRecentAttempts(email: string, sinceMs: number): Promise<number[]> {
    const result = await this.db().query(
      `SELECT attempted_at FROM rate_attempts
       WHERE email = $1 AND attempted_at >= $2
       ORDER BY attempted_at ASC`,
      [email, sinceMs]
    );
    return (result.rows as { attempted_at: string | number | bigint }[]).map((row) => Number(row.attempted_at));
  }

  async recordAttempt(email: string, attemptedAt: number): Promise<void> {
    await this.db().query("INSERT INTO rate_attempts (email, attempted_at) VALUES ($1, $2)", [email, attemptedAt]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
