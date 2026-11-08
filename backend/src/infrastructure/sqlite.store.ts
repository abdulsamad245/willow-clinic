import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Cursor } from "../shared/pagination.js";
import type { Booking, BookingStatus, IdempotencyRecord, Slot, SlotWithAvailability } from "../shared/types.js";
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
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS slots (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        start TEXT NOT NULL,
        "end" TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        slot_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_per_slot
        ON bookings(slot_id) WHERE status = 'confirmed';

      CREATE INDEX IF NOT EXISTS bookings_email_created
        ON bookings(email, created_at, id);

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        body_hash TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        response TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rate_attempts (
        email TEXT NOT NULL,
        attempted_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS rate_attempts_email_time
        ON rate_attempts(email, attempted_at);
    `);
  }

  transact<T>(fn: () => T): T {
    let lastError: unknown;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        this.db.exec("BEGIN IMMEDIATE");
        const result = fn();
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

  reset(slots: Slot[]): void {
    this.transact(() => {
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

  listSlots(provider?: string): SlotWithAvailability[] {
    const rows = provider
      ? (this.db
          .prepare(
            `SELECT s.id, s.provider, s.start, s."end" AS end_time,
                    CASE WHEN b.id IS NULL THEN 0 ELSE 1 END AS taken
             FROM slots s
             LEFT JOIN bookings b
               ON b.slot_id = s.id AND b.status = 'confirmed'
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
               ON b.slot_id = s.id AND b.status = 'confirmed'
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

  getSlot(id: string): Slot | null {
    const row = this.db
      .prepare(`SELECT id, provider, start, "end" AS end_time FROM slots WHERE id = ?`)
      .get(id) as Omit<SlotRow, "taken"> | undefined;
    if (!row) return null;
    return { id: row.id, provider: row.provider, start: row.start, end: row.end_time };
  }

  slotCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM slots").get() as { n: number | bigint };
    return Number(row.n);
  }

  getBooking(id: string): Booking | null {
    const row = this.db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
    return row ? toBooking(row) : null;
  }

  findConfirmedBooking(slotId: string): { id: string } | null {
    const row = this.db
      .prepare(`SELECT id FROM bookings WHERE slot_id = ? AND status = 'confirmed'`)
      .get(slotId) as { id: string } | undefined;
    return row ?? null;
  }

  insertBooking(booking: Booking): void {
    this.db
      .prepare(
        `INSERT INTO bookings (id, slot_id, name, email, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(booking.id, booking.slot_id, booking.name, booking.email, booking.status, booking.created_at);
  }

  cancelBooking(id: string): void {
    this.db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(id);
  }

  listBookings(email: string, limitPlusOne: number, cursor?: Cursor): Booking[] {
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

  getIdempotency(key: string): IdempotencyRecord | null {
    const row = this.db
      .prepare("SELECT body_hash, status_code, response FROM idempotency_keys WHERE key = ?")
      .get(key) as IdempotencyRecord | undefined;
    return row ?? null;
  }

  saveIdempotency(key: string, bodyHash: string, status: number, body: unknown): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO idempotency_keys (key, body_hash, status_code, response)
         VALUES (?, ?, ?, ?)`
      )
      .run(key, bodyHash, status, JSON.stringify(body));
  }

  countRecentAttempts(email: string, sinceMs: number): number[] {
    const rows = this.db
      .prepare(
        `SELECT attempted_at FROM rate_attempts
         WHERE email = ? AND attempted_at >= ?
         ORDER BY attempted_at ASC`
      )
      .all(email, sinceMs) as { attempted_at: number | bigint }[];
    return rows.map((row) => Number(row.attempted_at));
  }

  recordAttempt(email: string, attemptedAt: number): void {
    this.db.prepare("INSERT INTO rate_attempts (email, attempted_at) VALUES (?, ?)").run(email, attemptedAt);
  }

  close(): void {
    this.db.close();
  }
}
