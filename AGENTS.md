# Willow Clinic

Follow `spec/openapi.json` exactly.

## Layout

- `backend/` owns every API route (`/slots`, `/bookings`, `/reset`).
- `frontend/` is Next.js UI only. Do not add Route Handlers for the spec.
- Frontend and backend are two URLs. The UI calls `NEXT_PUBLIC_API_BASE`.
- `packages/shared/` holds types and Zod schemas used by both.

## Contract

- Errors are `{ "error": "<message>" }`.
- Do not prefix routes with `/api`.
- Do not change status codes to look more RESTful.
- `X-API-Key` on spec routes; the page and `/health` stay public.
- Double-booking is prevented by a partial unique index, not only an `if`.
- `GET /bookings` uses cursor pagination, not page numbers.
- Rate limit is per email (5 / minute, failures included), not per IP.
- Do not commit secrets.

## Validation

Backend Zod/schemas are the source of truth. Frontend form checks are UX only.

## Agent workflow

Look and process live in `DESIGN.md`. For implement/change work, follow `.cursor/skills/willow-clinic/SKILL.md`. After a behaviour change: `npm test`, then `/review` (Bugbot or `/review-security`) before treating the work as done.
