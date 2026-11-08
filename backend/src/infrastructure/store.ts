import type { Booking, IdempotencyRecord, Slot, SlotWithAvailability } from "../shared/types.js";
import type { Cursor } from "../shared/pagination.js";

export type Store = {
  reset(slots: Slot[]): void;
  listSlots(provider?: string): SlotWithAvailability[];
  getSlot(id: string): Slot | null;
  slotCount(): number;
  getBooking(id: string): Booking | null;
  findConfirmedBooking(slotId: string): { id: string } | null;
  insertBooking(booking: Booking): void;
  cancelBooking(id: string): void;
  listBookings(email: string, limitPlusOne: number, cursor?: Cursor): Booking[];
  getIdempotency(key: string): IdempotencyRecord | null;
  saveIdempotency(key: string, bodyHash: string, status: number, body: unknown): void;
  countRecentAttempts(email: string, sinceMs: number): number[];
  recordAttempt(email: string, attemptedAt: number): void;
  transact<T>(fn: () => T): T;
  close(): void;
};
