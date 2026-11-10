# Willow Clinic

A clinic booking API and a booking page, on two URLs.

- **Backend** — Express API
- **Frontend** — Next.js UI

Contract: [`spec/openapi.json`](spec/openapi.json). Spec routes use `X-API-Key` (set `API_KEY` in `backend/.env`, not in git).

---

## Architecture

The browser loads the page and talks to same-origin Next.js `app/api` routes. Those attach `X-API-Key` and forward to Express. Checkers and `/docs` still call the API host with the key.

```mermaid
flowchart LR
  user[Browser]
  web[Frontend · Next.js]
  api[Backend · Express]
  db[(Postgres or SQLite)]

  user -->|page and /api| web
  web -->|"JSON + X-API-Key"| api
  api --> db
```

```mermaid
flowchart TB
  subgraph frontend["frontend/"]
    ui[Page and forms]
    routes["app/api routes"]
  end
  subgraph shared["packages/shared/"]
    zod[Types + Zod]
  end
  subgraph backend["backend/src"]
    http[http/ public routes and docs]
    modules[modules/ spec routes and services]
    store[infrastructure/ Postgres or SQLite]
  end

  ui --> zod
  ui --> routes
  routes -->|API_BASE_URL + API_KEY| http
  http --> modules --> store
  modules --> zod
```

The frontend does not implement `/slots` or `/bookings`. The backend never serves the Next.js app.

The store uses parameterized SQL (`pg` `$1` placeholders, SQLite `?`) on purpose: this API is small, and bound queries are enough. If the app grew (more tables, more writes, more teams), we would add an ORM such as Prisma or Drizzle — that is the usual next step, not a missing piece here.

Look and the agent workflow (spec → rules → tests → `/review`) are in [DESIGN.md](DESIGN.md).

---

## Run locally

Needs Node 22+. Two terminals:

```bash
npm install
npm test
```

```bash
npm run dev
```

API: [http://localhost:3001](http://localhost:3001)

Docs (Try it out): [http://localhost:3001/docs](http://localhost:3001/docs) — Authorize with `X-API-Key` from `backend/.env`.

```bash
npm run dev:frontend
```

Page: [http://localhost:3000](http://localhost:3000)

The page calls `/api/slots` and `/api/bookings` on the Next.js host. Set `API_BASE_URL` and `API_KEY` in `frontend/.env.local` (gitignored). The browser never sees the key.

`npm run dev` loads the sample timetable (Dr Ade, Dr Nkechi, Dr Tunde) if the database has no slots. To replace it later:

```bash
npm run seed
```

That is the same reset as `POST /reset` with the demo slots: it clears bookings and writes the sample timetable, then books 12 slots for `ada@example.com` so **Load more** (cursor paging) works on the page. Default page size is 10. It uses SQLite (`backend/data`) unless `DATABASE_URL` is set.

On success the process logs `Loaded sample timetable and 12 bookings for ada@example.com`.

On Render, set `DATABASE_URL` to the Postgres **External** URL (`?sslmode=require`) and run `npm run seed` from the repo root. Do not put seed in the Start Command.

### Postgres locally

`npm run dev` uses SQLite until `DATABASE_URL` is set. That writes `backend/data/clinic.db` (gitignored). It is only the local SQLite file. Tests do not use it.

To run the API against Postgres:

```bash
npm run db
```

Copy the `DATABASE_URL` line from `backend/.env.example` into gitignored `backend/.env`, then `npm run dev` again. Stop it with `npm run db:down`. Compose only runs Postgres; Node still runs on the host.

---

## Tests

```bash
npm test
```

Unit tests for email, booking fields, and cursor pagination, then the HTTP contract against SQLite in memory. Fast, no Docker. Does not read `backend/data`.

```bash
npm run test:postgres
```

The same contract against a throwaway Postgres started by [Testcontainers](https://node.testcontainers.org/modules/postgresql/). Needs Docker. It does **not** use `npm run db` and does **not** use `backend/data`. CI runs both.

| Command | What it is for |
|---|---|
| `npm run db` | Long-lived Postgres so `npm run dev` can use `DATABASE_URL` |
| `npm run test:postgres` | Prove the API against real Postgres, then throw the container away |
| `npm test` | Unit tests + SQLite HTTP contract, no Docker |

---

## Deploy

Two URLs, same as local.

| Piece | Where | What to set |
|---|---|---|
| API | [Render](https://render.com) (`render.yaml`) | Set `API_KEY` in the dashboard (not in git). `DATABASE_URL` from a Render Postgres instance. `FRONTEND_ORIGIN` to the page URL |
| Page | [Vercel](https://vercel.com) | Import **frontend** only (not the Express app or the container). Root Directory `frontend`. Install: `cd .. && npm install`. Turn on **Include source files outside of the Root Directory**. Server env: `API_BASE_URL` = the Render API URL (no trailing slash), `API_KEY` = the same value as Render `API_KEY` (not `NEXT_PUBLIC_`). Then build |

Do not commit `.env` files. SQLite `DB_PATH` on Render does not survive deploys; use Postgres there.

---

## API

All spec routes need `X-API-Key`. `/`, `/health`, `/docs`, and `/openapi.json` do not.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/slots` | List slots, earliest first. Optional `?provider=` |
| `POST` | `/bookings` | Book a slot |
| `GET` | `/bookings/{id}` | Look up a booking |
| `DELETE` | `/bookings/{id}` | Cancel and free the slot |
| `GET` | `/bookings?email=` | That person's bookings (cursor page) |
| `POST` | `/reset` | Replace the timetable |

Errors: `{ "error": "..." }`. Do not wrap bodies in `{ success, data }` — that is not this spec.

Request logs (method, URL, status, `X-Request-Id`) go to stdout via Pino. `/health` and `/docs` are not logged.

---

## Config

**Backend**

| Env | Default |
|---|---|
| `PORT` | `3001` |
| `API_KEY` | set in `backend/.env` (gitignored) |
| `DB_PATH` | `./data/clinic.db` (used when `DATABASE_URL` is unset) |
| `DATABASE_URL` | empty — set this for Postgres |
| `FRONTEND_ORIGIN` | `*` |
| `LOG_LEVEL` | `info` (`silent` during `npm test`) |

**Frontend**

| Env | Default |
|---|---|
| `API_BASE_URL` | Express URL (`frontend/.env.local`, gitignored) |
| `API_KEY` | same value as the API `API_KEY` (`frontend/.env.local`, gitignored) |
