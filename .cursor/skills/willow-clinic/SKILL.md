---
name: willow-clinic
description: Implement or change Willow Clinic against spec/openapi.json. Use when editing backend, frontend, shared schemas, slots, bookings, reset, pagination, rate limits, or the booking page.
---

# Willow Clinic

Read `AGENTS.md` and `spec/openapi.json` before writing code. Do not invent routes or status codes.

## Layout

- `backend/` owns `/slots`, `/bookings`, `/reset`. No `/api` prefix.
- Public HTTP (`/`, `/health`, `/docs`) lives in `backend/src/http/`. Spec routes live in `modules/`. Do not add `src/web/` (that name means UI).
- `frontend/` is Next.js UI. `app/api` routes attach `X-API-Key` and forward to Express. Do not reimplement bookings there.
- Two hosts. Checkers call the Express URL with `X-API-Key`. The page does not.
- Shared types and Zod live in `packages/shared/` (`slots.ts`, `bookings.ts`, `forms.ts`, `email.ts`). `index.ts` re-exports only. Use `BookingStatus` and `isValidEmail` from there. Do not duplicate those types in the backend. Do not use TypeScript `enum`.
- Schema changes go in `backend/src/infrastructure/migrations/` as a new numbered `.sql` file.
- Postgres when `DATABASE_URL` is set. `npm test` is SQLite. `npm run test:postgres` uses Testcontainers (Docker). Local Postgres: `npm run db`. `npm run seed` replaces the sample timetable and 12 bookings for `ada@example.com`. Keep `Store` async. Parameterized SQL is intentional at this size; do not add Prisma/Drizzle unless the schema grows.

## Contract

- Errors: `{ "error": "<message>" }`. No `{ success, data }` envelope.
- Keep spec status codes (401, 400, 404, 409, 422, 429, 201).
- Confirmed double-booking is blocked by a partial unique index, not only an `if`.
- `GET /bookings` is cursor pagination, not page numbers.
- Rate limit is 5 requests per email per minute, including failures, not per IP.
- `/` and `/health` stay public. Spec routes need `X-API-Key`.
- Look: `DESIGN.md`. Custom dropdowns, day paging, Grid/List.

## Loop

1. Point at the spec behaviour you are changing.
2. Implement in the owning folder (`backend/` or `frontend/`).
3. From the repo root run `npm test` (unit + SQLite HTTP). If you touched SQL or `Store`, also run `npm run test:postgres` (needs Docker).
4. If a test fails, fix from the failure output. Do not claim done from the UI alone.
5. After a behaviour change, run `/review` (Bugbot) or `/review-security`.
6. Do not commit secrets (`.env`, keys, credentials).

## Do not

- Reimplement `/slots` or `/bookings` in Next.js. Forwarding from `app/api` routes is fine.
- Change status codes to look more RESTful.
