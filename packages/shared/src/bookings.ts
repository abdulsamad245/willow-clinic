import { z } from "zod";
import { isValidEmail } from "./email.js";

export const BOOKING_STATUSES = ["confirmed", "cancelled"] as const;

export const BookingStatus = {
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
} as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

export type Booking = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: BookingStatus;
  created_at: string;
};

export type ErrorBody = { error: string };

export const bookingBodySchema = z.object({
  slot_id: z.unknown().optional(),
  name: z.unknown().optional(),
  email: z.unknown().optional(),
});

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

function field(value: unknown): string {
  return value == null ? "" : String(value);
}

export function parseBookingBody(body: unknown): {
  slot_id: string;
  name: string;
  email: string;
  emailNorm: string;
} {
  const parsed = bookingBodySchema.parse(asRecord(body));
  const email = field(parsed.email);
  return {
    slot_id: field(parsed.slot_id).trim(),
    name: field(parsed.name).trim(),
    email,
    emailNorm: email.trim().toLowerCase(),
  };
}

export function bookingFieldError(input: {
  slot_id: string;
  name: string;
  email: string;
  emailNorm: string;
}): "missing" | "invalid_email" | null {
  if (!input.slot_id || !input.name || !input.email.trim()) return "missing";
  if (!isValidEmail(input.emailNorm)) return "invalid_email";
  return null;
}
