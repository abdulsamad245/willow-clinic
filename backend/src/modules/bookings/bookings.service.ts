import { randomUUID } from "node:crypto";
import { BookingStatus, bookingFieldError, parseBookingBody } from "@willow/shared";
import { sha256 } from "../../shared/crypto.js";
import { fail, HttpStatus, ok } from "../../shared/http.js";
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

function isUniqueViolation(err: unknown): boolean {
  const error = err as { code?: string; message?: string };
  return error.code === "23505" || String(error.message).includes("UNIQUE");
}

export class BookingService {
  constructor(private readonly store: Store) {}

  create(input: CreateBookingInput): Promise<HttpResult<Booking | ErrorBody>> {
    const parsed = parseBookingBody(input.body);
    const slotId = parsed.slot_id;
    const name = parsed.name;
    const bodyHash = sha256(input.rawBody ?? JSON.stringify(asRecord(input.body)));
    const key = input.idempotencyKey ? String(input.idempotencyKey).trim() : "";
    const now = input.now;

    return this.store.transact(async () => {
      if (key) {
        const existing = await this.store.getIdempotency(key);
        if (existing) {
          if (existing.body_hash === bodyHash) {
            return ok(existing.status_code, JSON.parse(existing.response) as Booking | ErrorBody);
          }
          return fail(HttpStatus.UNPROCESSABLE, "idempotency key reused with a different body");
        }
      }

      const emailNorm = parsed.emailNorm;
      if (emailNorm) {
        const recent = await this.store.countRecentAttempts(emailNorm, now.getTime() - WINDOW_MS);
        if (recent.length >= MAX_ATTEMPTS) {
          const retryAfter = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now.getTime()) / 1000));
          return fail(HttpStatus.TOO_MANY_REQUESTS, "too many attempts", { "Retry-After": String(retryAfter) });
        }
        await this.store.recordAttempt(emailNorm, now.getTime());
      }

      const fieldError = bookingFieldError(parsed);
      if (fieldError === "missing") {
        return this.remember(key, bodyHash, fail(HttpStatus.BAD_REQUEST, "missing required fields"));
      }
      if (fieldError === "invalid_email") {
        return this.remember(key, bodyHash, fail(HttpStatus.BAD_REQUEST, "invalid email"));
      }

      const slot = await this.store.getSlot(slotId);
      if (!slot) {
        return this.remember(key, bodyHash, fail(HttpStatus.NOT_FOUND, "slot not found"));
      }

      const startMs = Date.parse(slot.start);
      if (!Number.isNaN(startMs) && startMs <= now.getTime()) {
        return this.remember(key, bodyHash, fail(HttpStatus.BAD_REQUEST, "slot has already started"));
      }

      if (await this.store.findConfirmedBooking(slotId)) {
        return this.remember(key, bodyHash, fail(HttpStatus.CONFLICT, "slot already booked"));
      }

      const booking: Booking = {
        id: randomUUID(),
        slot_id: slotId,
        name,
        email: emailNorm,
        status: BookingStatus.CONFIRMED,
        created_at: now.toISOString(),
      };

      try {
        await this.store.insertBooking(booking);
      } catch (err) {
        if (isUniqueViolation(err)) {
          return this.remember(key, bodyHash, fail(HttpStatus.CONFLICT, "slot already booked"));
        }
        throw err;
      }

      return this.remember(key, bodyHash, ok(HttpStatus.CREATED, booking));
    });
  }

  async getById(id: string): Promise<HttpResult<Booking | ErrorBody>> {
    const booking = await this.store.getBooking(id);
    if (!booking) return fail(HttpStatus.NOT_FOUND, "no booking with that id");
    return ok(HttpStatus.OK, booking);
  }

  cancel(id: string): Promise<HttpResult<Booking | ErrorBody>> {
    return this.store.transact(async () => {
      const booking = await this.store.getBooking(id);
      if (!booking) return fail(HttpStatus.NOT_FOUND, "no booking with that id");
      if (booking.status === BookingStatus.CANCELLED) return fail(HttpStatus.CONFLICT, "already cancelled");
      await this.store.cancelBooking(id);
      return ok(HttpStatus.OK, { ...booking, status: BookingStatus.CANCELLED });
    });
  }

  async listByEmail(query: {
    email?: string;
    limit?: string;
    cursor?: string;
  }): Promise<HttpResult<{ bookings: Booking[]; next_cursor: string | null } | ErrorBody>> {
    if (query.email == null || String(query.email).trim() === "") {
      return fail(HttpStatus.BAD_REQUEST, "email is required");
    }

    const parsedLimit = parseLimit(query.limit);
    if (parsedLimit === "invalid") return fail(HttpStatus.BAD_REQUEST, "invalid limit");

    let cursor;
    if (query.cursor) {
      cursor = decodeCursor(query.cursor);
      if (!cursor) return fail(HttpStatus.BAD_REQUEST, "invalid cursor");
    }

    const emailNorm = String(query.email).trim().toLowerCase();
    const rows = await this.store.listBookings(emailNorm, parsedLimit + 1, cursor);
    const hasMore = rows.length > parsedLimit;
    const page = hasMore ? rows.slice(0, parsedLimit) : rows;
    const last = page[page.length - 1];
    return ok(HttpStatus.OK, {
      bookings: page,
      next_cursor: hasMore && last ? encodeCursor(last) : null,
    });
  }

  private async remember<T>(key: string, bodyHash: string, result: HttpResult<T>): Promise<HttpResult<T>> {
    if (key && result.status !== HttpStatus.TOO_MANY_REQUESTS) {
      await this.store.saveIdempotency(key, bodyHash, result.status, result.body);
    }
    return result;
  }
}
