const FROM_API: Record<string, string> = {
  unauthorized: "The clinic could not authorise this request. Please refresh the page and try again.",
  "missing required fields": "Please enter your full name and email.",
  "invalid email": "That email does not look quite right. Please use a format like name@example.com.",
  "slot not found": "That time is no longer on the timetable. Please pick another slot.",
  "slot has already started": "That time has already passed. Please pick another slot.",
  "slot already booked": "That slot was just taken. Please pick another time.",
  "no booking with that id": "We could not find a booking with that confirmation number.",
  "already cancelled": "This booking is already cancelled.",
  "too many attempts": "Please wait a minute before trying that email again.",
  "email is required": "Please enter the email used when you booked.",
  "not found": "We could not find that. Please check the details and try again.",
  "internal error": "Something went wrong on our side. Please try again in a moment.",
};

export function userMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.trim() : "";
  if (!raw) return fallback;
  if (FROM_API[raw]) return FROM_API[raw];
  if (/^[A-Z]/.test(raw)) return raw;
  return fallback;
}
