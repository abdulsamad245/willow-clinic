import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { before, beforeEach, describe, it } from "node:test";
import { createApp } from "../../src/app.js";
import type { Store } from "../../src/infrastructure/store.js";
import type { Slot } from "../../src/shared/types.js";

export const API_KEY = "test-key";

export const FUTURE: Slot = {
  id: "s1",
  provider: "Dr Ade",
  start: "2027-06-01T09:00:00Z",
  end: "2027-06-01T09:30:00Z",
};
export const FUTURE_2: Slot = {
  id: "s2",
  provider: "Dr Ade",
  start: "2027-06-01T10:00:00Z",
  end: "2027-06-01T10:30:00Z",
};
export const FUTURE_NKECHI: Slot = {
  id: "s3",
  provider: "Dr Nkechi",
  start: "2027-06-01T11:00:00Z",
  end: "2027-06-01T11:30:00Z",
};
export const PAST: Slot = {
  id: "past",
  provider: "Dr Ade",
  start: "2020-01-01T09:00:00Z",
  end: "2020-01-01T09:30:00Z",
};

export async function listen(store: Store): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp({ store, apiKey: API_KEY });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

type RequestFn = (
  path: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    apiKey?: string | null;
  }
) => Promise<{ status: number; headers: Headers; data: unknown }>;

export function makeRequest(getBaseUrl: () => string): RequestFn {
  return async (path, { method = "GET", headers = {}, body, apiKey = API_KEY } = {}) => {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
        ...headers,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  };
}

export function registerContract(getBaseUrl: () => string): void {
  const request = makeRequest(getBaseUrl);

  async function reset(slots: Slot[] = [FUTURE, FUTURE_2, FUTURE_NKECHI, PAST]) {
    const res = await request("/reset", { method: "POST", body: { slots } });
    assert.equal(res.status, 200);
    return res;
  }

  beforeEach(async () => {
    await reset();
  });

  describe("e2e auth", () => {
    it("rejects a missing or wrong API key with 401 on spec routes", async () => {
      const missing = await request("/slots", { apiKey: null });
      assert.equal(missing.status, 401);
      assert.deepEqual(missing.data, { error: "unauthorized" });

      const wrong = await request("/slots", { apiKey: "nope" });
      assert.equal(wrong.status, 401);

      const bookings = await request("/bookings", {
        method: "POST",
        apiKey: null,
        body: { slot_id: "s1", name: "Ada", email: "ada@example.com" },
      });
      assert.equal(bookings.status, 401);
      assert.equal(typeof (bookings.data as { error: string }).error, "string");
    });
  });

  describe("e2e level 1", () => {
    it("exposes the API root without a key", async () => {
      const res = await fetch(`${getBaseUrl()}/`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { service?: string };
      assert.equal(body.service, "willow-clinic-api");
    });

    it("serves Swagger UI and the OpenAPI document without a key", async () => {
      const docs = await fetch(`${getBaseUrl()}/docs/`);
      assert.equal(docs.status, 200);
      const html = await docs.text();
      assert.match(html, /swagger/i);

      const spec = await fetch(`${getBaseUrl()}/openapi.json`);
      assert.equal(spec.status, 200);
      const body = (await spec.json()) as { openapi?: string; servers?: { url: string }[] };
      assert.equal(body.openapi, "3.0.3");
      assert.equal(body.servers?.[0]?.url, getBaseUrl());
    });

    it("lists slots earliest start first, with availability", async () => {
      const res = await request("/slots");
      assert.equal(res.status, 200);
      const slots = (res.data as { slots: Array<{ id: string; available: boolean }> }).slots;
      assert.equal(slots[0].id, "past");
      assert.equal(slots.at(-1)?.id, "s3");
      assert.equal(slots.find((slot) => slot.id === "s1")?.available, true);
    });

    it("filters slots by exact provider", async () => {
      const res = await request("/slots?provider=Dr%20Nkechi");
      const slots = (res.data as { slots: Array<{ id: string }> }).slots;
      assert.equal(slots.length, 1);
      assert.equal(slots[0].id, "s3");
    });

    it("replaces every slot on POST /reset, including slots in the past", async () => {
      const res = await request("/reset", {
        method: "POST",
        body: { slots: [PAST, FUTURE] },
      });
      assert.equal(res.status, 200);

      const listed = await request("/slots");
      const slots = (listed.data as { slots: Array<{ id: string }> }).slots;
      assert.deepEqual(
        slots.map((slot) => slot.id),
        ["past", "s1"]
      );

      const bad = await request("/reset", { method: "POST", body: {} });
      assert.equal(bad.status, 400);
      assert.equal(typeof (bad.data as { error: string }).error, "string");
    });

    it("returns 404 for an unknown booking id", async () => {
      const res = await request("/bookings/does-not-exist");
      assert.equal(res.status, 404);
      assert.equal(typeof (res.data as { error: string }).error, "string");
    });

    it("books a slot and looks it up", async () => {
      const booked = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "Ada Obi", email: "ada@example.com" },
      });
      assert.equal(booked.status, 201);
      const created = booked.data as { id: string; status: string; email: string; created_at: string };
      assert.equal(created.status, "confirmed");
      assert.equal(created.email, "ada@example.com");
      assert.ok(created.id);
      assert.ok(created.created_at);

      const fetched = await request(`/bookings/${created.id}`);
      assert.equal(fetched.status, 200);
      assert.equal((fetched.data as { id: string }).id, created.id);

      const slots = await request("/slots");
      const listed = (slots.data as { slots: Array<{ id: string; available: boolean }> }).slots;
      assert.equal(listed.find((slot) => slot.id === "s1")?.available, false);
    });
  });

  describe("e2e level 2", () => {
    it("turns away missing fields, invalid email, unknown slots and past slots", async () => {
      const missing = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "Ada", email: "" },
      });
      assert.equal(missing.status, 400);

      const invalid = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "Ada", email: "not-an-email" },
      });
      assert.equal(invalid.status, 400);

      const unknown = await request("/bookings", {
        method: "POST",
        body: { slot_id: "missing", name: "Ada", email: "ada@example.com" },
      });
      assert.equal(unknown.status, 404);

      const past = await request("/bookings", {
        method: "POST",
        body: { slot_id: "past", name: "Ada", email: "ada@example.com" },
      });
      assert.equal(past.status, 400);
      assert.equal((past.data as { error: string }).error, "slot has already started");
    });

    it("trims name and stores email in lower case", async () => {
      const booked = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "  Ada Obi  ", email: "  Ada@Example.COM " },
      });
      assert.equal(booked.status, 201);
      const created = booked.data as { name: string; email: string };
      assert.equal(created.name, "Ada Obi");
      assert.equal(created.email, "ada@example.com");
    });
  });

  describe("e2e level 3", () => {
    it("never double-books a slot, including concurrent requests", async () => {
      const attempts = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          request("/bookings", {
            method: "POST",
            body: { slot_id: "s1", name: "Ada Obi", email: `ada${i}@example.com` },
          })
        )
      );
      assert.equal(attempts.filter((res) => res.status === 201).length, 1);
      assert.equal(attempts.filter((res) => res.status === 409).length, 19);
      assert.equal(typeof (attempts.find((res) => res.status === 409)?.data as { error: string }).error, "string");
    });

    it("cancels a booking and frees the slot", async () => {
      const booked = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "Ada Obi", email: "ada@example.com" },
      });
      const id = (booked.data as { id: string }).id;
      const cancelled = await request(`/bookings/${id}`, { method: "DELETE" });
      assert.equal(cancelled.status, 200);
      assert.equal((cancelled.data as { status: string }).status, "cancelled");

      const again = await request(`/bookings/${id}`, { method: "DELETE" });
      assert.equal(again.status, 409);

      const missing = await request("/bookings/does-not-exist", { method: "DELETE" });
      assert.equal(missing.status, 404);

      const rebook = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "Chidi", email: "chidi@example.com" },
      });
      assert.equal(rebook.status, 201);
    });
  });

  describe("e2e level 4", () => {
    it("replays the same idempotency key and rejects a different body", async () => {
      const headers = { "Idempotency-Key": "ada-1" };
      const body = { slot_id: "s1", name: "Ada Obi", email: "ada@example.com" };
      const first = await request("/bookings", { method: "POST", headers, body });
      const second = await request("/bookings", { method: "POST", headers, body });
      assert.equal(first.status, 201);
      assert.equal(second.status, 201);
      assert.equal((first.data as { id: string }).id, (second.data as { id: string }).id);

      const different = await request("/bookings", {
        method: "POST",
        headers,
        body: { slot_id: "s2", name: "Ada Obi", email: "ada@example.com" },
      });
      assert.equal(different.status, 422);
      assert.equal(typeof (different.data as { error: string }).error, "string");

      const slots = await request("/slots");
      const listed = (slots.data as { slots: Array<{ available: boolean }> }).slots;
      assert.equal(listed.filter((slot) => !slot.available).length, 1);
    });

    it("pages through a person's bookings with a cursor, oldest first", async () => {
      for (const slotId of ["s1", "s2", "s3"]) {
        const res = await request("/bookings", {
          method: "POST",
          body: { slot_id: slotId, name: "Ada Obi", email: "ada@example.com" },
        });
        assert.equal(res.status, 201);
      }

      const page1 = await request("/bookings?email=ADA@example.com&limit=2");
      assert.equal(page1.status, 200);
      const first = page1.data as {
        bookings: Array<{ slot_id: string }>;
        next_cursor: string | null;
      };
      assert.equal(first.bookings.length, 2);
      assert.ok(first.next_cursor);
      assert.equal(first.bookings[0].slot_id, "s1");

      const page2 = await request(
        `/bookings?email=ada@example.com&limit=2&cursor=${encodeURIComponent(first.next_cursor as string)}`
      );
      const second = page2.data as {
        bookings: Array<{ slot_id: string }>;
        next_cursor: string | null;
      };
      assert.equal(second.bookings.length, 1);
      assert.equal(second.next_cursor, null);

      const badLimit = await request("/bookings?email=ada@example.com&limit=0");
      assert.equal(badLimit.status, 400);

      const tooBig = await request("/bookings?email=ada@example.com&limit=51");
      assert.equal(tooBig.status, 400);

      const missingEmail = await request("/bookings");
      assert.equal(missingEmail.status, 400);
      assert.equal(typeof (missingEmail.data as { error: string }).error, "string");
    });
  });

  describe("e2e level 5", () => {
    it("caps an email at 5 attempts a minute, including failures", async () => {
      for (let i = 0; i < 5; i += 1) {
        const failed = await request("/bookings", {
          method: "POST",
          body: { slot_id: "s1", name: "", email: "spam@example.com" },
        });
        assert.equal(failed.status, 400);
      }

      const blocked = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "Spam", email: "spam@example.com" },
      });
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get("retry-after")) >= 1);
      assert.equal(typeof (blocked.data as { error: string }).error, "string");

      const other = await request("/bookings", {
        method: "POST",
        body: { slot_id: "s1", name: "Ada", email: "ada@example.com" },
      });
      assert.equal(other.status, 201);
    });
  });
}

export function registerPersistence(open: () => Promise<Store>): void {
  describe("e2e persistence", () => {
    it("still has the booking after reopening the store", async () => {
      const first = await open();
      const { server, baseUrl } = await listen(first);

      const resetRes = await fetch(`${baseUrl}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ slots: [FUTURE] }),
      });
      assert.equal(resetRes.status, 200);
      const createdRes = await fetch(`${baseUrl}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ slot_id: "s1", name: "Ada", email: "ada@example.com" }),
      });
      const booking = (await createdRes.json()) as { id: string };
      await closeServer(server);
      await first.close();

      const second = await open();
      const again = await listen(second);
      const fetched = await fetch(`${again.baseUrl}/bookings/${booking.id}`, {
        headers: { "X-API-Key": API_KEY },
      });
      assert.equal(fetched.status, 200);
      const data = (await fetched.json()) as { email: string };
      assert.equal(data.email, "ada@example.com");
      await closeServer(again.server);
      await second.close();
    });
  });
}

export function registerStoreLifecycle(open: () => Promise<Store>): {
  getBaseUrl: () => string;
  cleanup: () => Promise<void>;
} {
  let store: Store | undefined;
  let server: Server | undefined;
  let baseUrl = "";

  before(async () => {
    store = await open();
    const listening = await listen(store);
    server = listening.server;
    baseUrl = listening.baseUrl;
  });

  return {
    getBaseUrl: () => baseUrl,
    cleanup: async () => {
      if (server) await closeServer(server);
      await store?.close();
    },
  };
}
