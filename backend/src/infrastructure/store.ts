import type { Booking, IdempotencyRecord, Slot, SlotWithAvailability } from "../shared/types.js";
import type { Cursor } from "../shared/pagination.js";

export type Store = {
  reset(slots: Slot[]): Promise<void>;
  listSlots(provider?: string): Promise<SlotWithAvailability[]>;
  getSlot(id: string): Promise<Slot | null>;
  slotCount(): Promise<number>;
  getBooking(id: string): Promise<Booking | null>;
  findConfirmedBooking(slotId: string): Promise<{ id: string } | null>;
  insertBooking(booking: Booking): Promise<void>;
  cancelBooking(id: string): Promise<void>;
  listBookings(email: string, limitPlusOne: number, cursor?: Cursor): Promise<Booking[]>;
  getIdempotency(key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(key: string, bodyHash: string, status: number, body: unknown): Promise<void>;
  countRecentAttempts(email: string, sinceMs: number): Promise<number[]>;
  recordAttempt(email: string, attemptedAt: number): Promise<void>;
  transact<T>(fn: () => Promise<T>): Promise<T>;
  close(): Promise<void> | void;
};
