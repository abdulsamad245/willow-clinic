import { z } from "zod";
import { isValidEmail } from "./email";

export const bookFormSchema = z.object({
  name: z.string().trim().min(1, "Please enter your full name so it can appear on the confirmation."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter an email so you can look up this booking later.")
    .refine(isValidEmail, "That email does not look quite right. Please use a format like name@example.com."),
});

export const lookupEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter the email used when you booked.")
    .refine(isValidEmail, "That email does not look quite right. Please check for a missing @ or a typo."),
});

export const lookupIdSchema = z.object({
  id: z.string().trim().min(1, "Please paste the booking id."),
});

export const lookupQuerySchema = z.object({
  query: z.string().trim().min(1, "Please enter a booking id or the email used when you booked."),
});

export type FormErrors = Partial<Record<string, string>>;

export function formErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
