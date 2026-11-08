---
name: willow-clinic
description: Implement or change Willow Clinic against spec/openapi.json. Use when editing backend, frontend, shared schemas, slots, bookings, reset, pagination, rate limits, or the booking page.
---

# Willow Clinic

Read `AGENTS.md` and `spec/openapi.json` before writing code. Do not invent routes or status codes.

## Layout

- `backend/` owns `/slots`, `/bookings`, `/reset`. No `/api` prefix.
- `frontend/` is Next.js UI only. No Route Handlers for those paths.
- Two hosts. UI calls `NEXT_PUBLIC_API_BASE` with `X-API-Key`.
- Shared types and Zod live in `packages/shared/`. Backend validation is the source of truth.

## Contract

- Errors: `{ "error": "<message>" }`.
- Keep spec status codes (401, 400, 404, 409, 422, 429, 201).
- Confirmed double-booking is blocked by a partial unique index, not only an `if`.
- `GET /bookings` is cursor pagination, not page numbers.
- Rate limit is 5 requests per email per minute, including failures, not per IP.
- `/` and `/health` stay public. Spec routes need `X-API-Key`.
- Look: `DESIGN.md`. Custom dropdowns, day paging, Grid/List.

## Loop

1. Point at the spec behaviour you are changing.
2. Implement in the owning folder (`backend/` or `frontend/`).
3. From the repo root run `npm test` (HTTP e2e in `backend/test/e2e/`, not mocks).
4. If a test fails, fix from the failure output. Do not claim done from the UI alone.
5. After a behaviour change, run `/review` (Bugbot) or `/review-security`.
6. Do not commit secrets (`.env`, keys, credentials).

## Do not

- Put booking API routes in Next.js.
- Change status codes to look more RESTful.
