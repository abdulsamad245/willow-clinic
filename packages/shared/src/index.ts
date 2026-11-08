import { z } from "zod";

export const bookingStatusSchema = z.enum(["confirmed", "cancelled"]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const slotSchema = z.object({
  id: z.coerce.string().min(1),
  provider: z.coerce.string().min(1),
  start: z.coerce.string().min(1),
  end: z.coerce.string().min(1),
});

export const resetBodySchema = z.object({
  slots: z.array(slotSchema),
});

export type Slot = z.infer<typeof slotSchema>;

export type SlotWithAvailability = Slot & { available: boolean };

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

export const bookFormSchema = z.object({
  name: z.string().trim().min(1, "Please add your full name so it can go on the confirmation."),
  email: z
    .string()
    .trim()
    .min(1, "Please add an email so you can look this booking up later.")
    .email("That email doesn't look quite right. Try something like name@example.com."),
});

export const lookupEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter the email used when booking.")
    .email("That email doesn't look quite right. Check for a missing @ or a typo."),
});

export const lookupIdSchema = z.object({
  id: z.string().trim().min(1, "Please paste the booking id from your confirmation."),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export function field(value: unknown): string {
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
  if (!EMAIL_RE.test(input.emailNorm)) return "invalid_email";
  return null;
}

export type FormErrors = Partial<Record<string, string>>;

export function formErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
