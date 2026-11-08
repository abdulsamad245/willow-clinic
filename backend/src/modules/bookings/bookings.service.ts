import { randomUUID } from "node:crypto";
import { bookingFieldError, parseBookingBody } from "@willow/shared";
import { sha256 } from "../../shared/crypto.js";
import { fail, ok } from "../../shared/http.js";
import { decodeCursor, encodeCursor, parseLimit } from "../../shared/pagination.js";
import type { Booking, ErrorBody, HttpResult } from "../../shared/types.js";
import type { Store } from "../../infrastructure/store.js";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export type CreateBookingInput = {
  body: unknown;
  rawBody?: string;
  idempotencyKey?: string | null;
  now: Date;
};

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export class BookingService {
  constructor(private readonly store: Store) {}

  create(input: CreateBookingInput): HttpResult<Booking | ErrorBody> {
    const parsed = parseBookingBody(input.body);
    const slotId = parsed.slot_id;
    const name = parsed.name;
    const bodyHash = sha256(input.rawBody ?? JSON.stringify(asRecord(input.body)));
    const key = input.idempotencyKey ? String(input.idempotencyKey).trim() : "";
    const now = input.now;

    return this.store.transact(() => {
      if (key) {
        const existing = this.store.getIdempotency(key);
        if (existing) {
          if (existing.body_hash === bodyHash) {
            return ok(existing.status_code, JSON.parse(existing.response) as Booking | ErrorBody);
          }
          return fail(422, "idempotency key reused with a different body");
        }
      }

      const emailNorm = parsed.emailNorm;
      if (emailNorm) {
        const recent = this.store.countRecentAttempts(emailNorm, now.getTime() - WINDOW_MS);
        if (recent.length >= MAX_ATTEMPTS) {
          const retryAfter = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now.getTime()) / 1000));
          return fail(429, "too many attempts", { "Retry-After": String(retryAfter) });
        }
        this.store.recordAttempt(emailNorm, now.getTime());
      }

      const fieldError = bookingFieldError(parsed);
      if (fieldError === "missing") {
        return this.remember(key, bodyHash, fail(400, "missing required fields"));
      }
      if (fieldError === "invalid_email") {
        return this.remember(key, bodyHash, fail(400, "invalid email"));
      }

      const slotIdTrim = slotId;
      const nameTrim = name;

      const slot = this.store.getSlot(slotIdTrim);
      if (!slot) {
        return this.remember(key, bodyHash, fail(404, "slot not found"));
      }

      const startMs = Date.parse(slot.start);
      if (!Number.isNaN(startMs) && startMs <= now.getTime()) {
        return this.remember(key, bodyHash, fail(400, "slot has already started"));
      }

      if (this.store.findConfirmedBooking(slotIdTrim)) {
        return this.remember(key, bodyHash, fail(409, "slot already booked"));
      }

      const booking: Booking = {
        id: randomUUID(),
        slot_id: slotIdTrim,
        name: nameTrim,
        email: emailNorm,
        status: "confirmed",
        created_at: now.toISOString(),
      };

      try {
        this.store.insertBooking(booking);
      } catch (err) {
        if (String((err as Error).message).includes("UNIQUE")) {
          return this.remember(key, bodyHash, fail(409, "slot already booked"));
        }
        throw err;
      }

      return this.remember(key, bodyHash, ok(201, booking));
    });
  }

  getById(id: string): HttpResult<Booking | ErrorBody> {
    const booking = this.store.getBooking(id);
    if (!booking) return fail(404, "no booking with that id");
    return ok(200, booking);
  }

  cancel(id: string): HttpResult<Booking | ErrorBody> {
    return this.store.transact(() => {
      const booking = this.store.getBooking(id);
      if (!booking) return fail(404, "no booking with that id");
      if (booking.status === "cancelled") return fail(409, "already cancelled");
      this.store.cancelBooking(id);
      return ok(200, { ...booking, status: "cancelled" as const });
    });
  }

  listByEmail(query: {
    email?: string;
    limit?: string;
    cursor?: string;
  }): HttpResult<{ bookings: Booking[]; next_cursor: string | null } | ErrorBody> {
    if (query.email == null || String(query.email).trim() === "") {
      return fail(400, "email is required");
    }

    const parsedLimit = parseLimit(query.limit);
    if (parsedLimit === "invalid") return fail(400, "invalid limit");

    let cursor;
    if (query.cursor) {
      cursor = decodeCursor(query.cursor);
      if (!cursor) return fail(400, "invalid cursor");
    }

    const emailNorm = String(query.email).trim().toLowerCase();
    const rows = this.store.listBookings(emailNorm, parsedLimit + 1, cursor);
    const hasMore = rows.length > parsedLimit;
    const page = hasMore ? rows.slice(0, parsedLimit) : rows;
    const last = page[page.length - 1];
    return ok(200, {
      bookings: page,
      next_cursor: hasMore && last ? encodeCursor(last) : null,
    });
  }

  private remember<T>(
    key: string,
    bodyHash: string,
    result: HttpResult<T>
  ): HttpResult<T> {
    if (key && result.status !== 429) {
      this.store.saveIdempotency(key, bodyHash, result.status, result.body);
    }
    return result;
  }
}
