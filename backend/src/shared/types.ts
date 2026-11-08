export type BookingStatus = "confirmed" | "cancelled";

export type Slot = {
  id: string;
  provider: string;
  start: string;
  end: string;
};

export type SlotWithAvailability = Slot & {
  available: boolean;
};

export type Booking = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: BookingStatus;
  created_at: string;
};

export type NewBooking = {
  slot_id: string;
  name: string;
  email: string;
};

export type ErrorBody = {
  error: string;
};

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
