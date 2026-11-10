import type { Booking, SlotWithAvailability } from "@willow/shared";

export type ApiError = Error & { status?: number };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error((data as { error?: string }).error || "Something went wrong. Please try again.") as ApiError;
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export function listSlots(provider?: string) {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  return request<{ slots: SlotWithAvailability[] }>(`/slots${query}`);
}

export function createBooking(body: { slot_id: string; name: string; email: string }) {
  return request<Booking>("/bookings", { method: "POST", body: JSON.stringify(body) });
}

export function getBooking(id: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}`);
}

export function listBookings(email: string, cursor?: string | null) {
  const params = new URLSearchParams({ email, limit: "10" });
  if (cursor) params.set("cursor", cursor);
  return request<{ bookings: Booking[]; next_cursor: string | null }>(`/bookings?${params.toString()}`);
}

export function cancelBooking(id: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}`, { method: "DELETE" });
}
