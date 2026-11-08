# Willow Clinic

Follow `spec/openapi.json` exactly.

## Layout

- `backend/` owns every API route (`/slots`, `/bookings`, `/reset`).
- `backend/src/http/` is public HTTP (`/`, `/health`, `/docs`). Spec routes live in `backend/src/modules/`. Do not use a `web/` folder (that name means UI in Express apps).
- `frontend/` is Next.js UI only. Do not add Route Handlers for the spec.
- Frontend and backend are two URLs. The UI calls `NEXT_PUBLIC_API_BASE`.
- `packages/shared/` holds types and Zod. Split by file (`slots.ts`, `bookings.ts`, `forms.ts`); `index.ts` only re-exports. Do not grow a god `index.ts`. The backend must import those contract types from `@willow/shared`, not duplicate them.
- Database schema lives in `backend/src/infrastructure/migrations/`. Add a new numbered `.sql` file; do not edit applied migrations.
- `Store` is async. Postgres when `DATABASE_URL` is set; SQLite otherwise.
- `npm test` is SQLite. `npm run test:postgres` is the same HTTP contract against Testcontainers Postgres (needs Docker). Local Postgres for `npm run dev` is `npm run db` (`compose.yaml`).

## Contract

- Errors are `{ "error": "<message>" }`. Do not wrap `{ success, data }`.
- `backend/data/` is the local SQLite file from `npm run dev` without `DATABASE_URL`. Gitignored. Not used by tests.
- `npm run db` is a long-lived Compose Postgres for local `DATABASE_URL`. `npm run test:postgres` starts its own Testcontainers Postgres and does not need `npm run db`.
- Do not prefix routes with `/api`.
- Do not change status codes to look more RESTful.
- `X-API-Key` on spec routes; `/`, `/health`, `/docs`, and `/openapi.json` stay public.
- Double-booking is prevented by a partial unique index, not only an `if`.
- `GET /bookings` uses cursor pagination, not page numbers.
- Rate limit is per email (5 / minute, failures included), not per IP.
- Do not commit secrets.

## Validation

Backend Zod/schemas are the source of truth. Frontend form checks are UX only.

## Agent workflow

Look and process live in `DESIGN.md`. For implement/change work, follow `.cursor/skills/willow-clinic/SKILL.md`. After a behaviour change: `npm test`, then `/review` (Bugbot or `/review-security`) before treating the work as done.
