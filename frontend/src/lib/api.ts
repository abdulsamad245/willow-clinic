import type { Booking, SlotWithAvailability } from "@willow/shared";

export type ApiError = Error & { status?: number };

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");

async function apiKey(): Promise<string> {
  if (typeof window !== "undefined" && window.APP?.apiKey) return window.APP.apiKey;
  const res = await fetch(`${API_BASE}/config.json`);
  if (!res.ok) return "";
  const data = (await res.json()) as { apiKey?: string };
  return data.apiKey ?? "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = await apiKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error((data as { error?: string }).error || `Request failed (${res.status})`) as ApiError;
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

declare global {
  interface Window {
    APP?: { apiKey: string };
  }
}
