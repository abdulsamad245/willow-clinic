export type { Booking, BookingStatus, ErrorBody, Slot, SlotWithAvailability } from "@willow/shared";

export type HttpResult<T> = {
  status: number;
  body: T;
  headers?: Record<string, string>;
};

export type IdempotencyRecord = {
  body_hash: string;
  status_code: number;
  response: string;
};
