import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { BookingStatus } from "@willow/shared";
import type { Cursor } from "../shared/pagination.js";
import type { Booking, IdempotencyRecord, Slot, SlotWithAvailability } from "../shared/types.js";
import { migrate } from "./migrate.js";
import type { Store } from "./store.js";

type SlotRow = {
  id: string;
  provider: string;
  start: string;
  end_time: string;
  taken: number | bigint;
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

export class SqliteStore implements Store {
  private readonly db: DatabaseSync;

  constructor(path = ":memory:") {
    if (path !== ":memory:") {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.db.exec("PRAGMA foreign_keys = ON");
    migrate(this.db);
  }

  async transact<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        this.db.exec("BEGIN IMMEDIATE");
        const result = await fn();
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        try {
          this.db.exec("ROLLBACK");
        } catch {
          // ignore
        }
        lastError = err;
        const message = String((err as Error).message ?? err);
        if (message.includes("BUSY") || message.includes("LOCKED")) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  async reset(slots: Slot[]): Promise<void> {
    await this.transact(async () => {
      this.db.exec("DELETE FROM bookings");
      this.db.exec("DELETE FROM slots");
      this.db.exec("DELETE FROM idempotency_keys");
      this.db.exec("DELETE FROM rate_attempts");
      const insert = this.db.prepare(
        `INSERT INTO slots (id, provider, start, "end") VALUES (?, ?, ?, ?)`
      );
      for (const slot of slots) {
        insert.run(slot.id, slot.provider, slot.start, slot.end);
      }
    });
  }

  async listSlots(provider?: string): Promise<SlotWithAvailability[]> {
    const rows = provider
      ? (this.db
          .prepare(
            `SELECT s.id, s.provider, s.start, s."end" AS end_time,
                    CASE WHEN b.id IS NULL THEN 0 ELSE 1 END AS taken
             FROM slots s
             LEFT JOIN bookings b
               ON b.slot_id = s.id AND b.status = '${BookingStatus.CONFIRMED}'
             WHERE s.provider = ?
             ORDER BY s.start ASC, s.id ASC`
          )
          .all(provider) as SlotRow[])
      : (this.db
          .prepare(
            `SELECT s.id, s.provider, s.start, s."end" AS end_time,
                    CASE WHEN b.id IS NULL THEN 0 ELSE 1 END AS taken
             FROM slots s
             LEFT JOIN bookings b
               ON b.slot_id = s.id AND b.status = '${BookingStatus.CONFIRMED}'
             ORDER BY s.start ASC, s.id ASC`
          )
          .all() as SlotRow[]);

    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      start: row.start,
      end: row.end_time,
      available: Number(row.taken) === 0,
    }));
  }

  async getSlot(id: string): Promise<Slot | null> {
    const row = this.db
      .prepare(`SELECT id, provider, start, "end" AS end_time FROM slots WHERE id = ?`)
      .get(id) as Omit<SlotRow, "taken"> | undefined;
    if (!row) return null;
    return { id: row.id, provider: row.provider, start: row.start, end: row.end_time };
  }

  async slotCount(): Promise<number> {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM slots").get() as { n: number | bigint };
    return Number(row.n);
  }

  async getBooking(id: string): Promise<Booking | null> {
    const row = this.db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
    return row ? toBooking(row) : null;
  }

  async findConfirmedBooking(slotId: string): Promise<{ id: string } | null> {
    const row = this.db
      .prepare(`SELECT id FROM bookings WHERE slot_id = ? AND status = '${BookingStatus.CONFIRMED}'`)
      .get(slotId) as { id: string } | undefined;
    return row ?? null;
  }

  async insertBooking(booking: Booking): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO bookings (id, slot_id, name, email, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(booking.id, booking.slot_id, booking.name, booking.email, booking.status, booking.created_at);
  }

  async cancelBooking(id: string): Promise<void> {
    this.db.prepare(`UPDATE bookings SET status = '${BookingStatus.CANCELLED}' WHERE id = ?`).run(id);
  }

  async listBookings(email: string, limitPlusOne: number, cursor?: Cursor): Promise<Booking[]> {
    const rows = cursor
      ? (this.db
          .prepare(
            `SELECT * FROM bookings
             WHERE email = ?
               AND (created_at > ? OR (created_at = ? AND id > ?))
             ORDER BY created_at ASC, id ASC
             LIMIT ?`
          )
          .all(email, cursor.created_at, cursor.created_at, cursor.id, limitPlusOne) as BookingRow[])
      : (this.db
          .prepare(
            `SELECT * FROM bookings
             WHERE email = ?
             ORDER BY created_at ASC, id ASC
             LIMIT ?`
          )
          .all(email, limitPlusOne) as BookingRow[]);
    return rows.map(toBooking);
  }

  async getIdempotency(key: string): Promise<IdempotencyRecord | null> {
    const row = this.db
      .prepare("SELECT body_hash, status_code, response FROM idempotency_keys WHERE key = ?")
      .get(key) as IdempotencyRecord | undefined;
    return row ?? null;
  }

  async saveIdempotency(key: string, bodyHash: string, status: number, body: unknown): Promise<void> {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO idempotency_keys (key, body_hash, status_code, response)
         VALUES (?, ?, ?, ?)`
      )
      .run(key, bodyHash, status, JSON.stringify(body));
  }

  async countRecentAttempts(email: string, sinceMs: number): Promise<number[]> {
    const rows = this.db
      .prepare(
        `SELECT attempted_at FROM rate_attempts
         WHERE email = ? AND attempted_at >= ?
         ORDER BY attempted_at ASC`
      )
      .all(email, sinceMs) as { attempted_at: number | bigint }[];
    return rows.map((row) => Number(row.attempted_at));
  }

  async recordAttempt(email: string, attemptedAt: number): Promise<void> {
    this.db.prepare("INSERT INTO rate_attempts (email, attempted_at) VALUES (?, ?)").run(email, attemptedAt);
  }

  close(): void {
    this.db.close();
  }
}
