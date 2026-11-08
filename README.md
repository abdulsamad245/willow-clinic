# Willow Clinic

A clinic booking API and a booking page, on two URLs.

- **Backend** — Express API
- **Frontend** — Next.js UI

Contract: [`spec/openapi.json`](spec/openapi.json). Spec routes use `X-API-Key` (see `.env.example`).

---

## Architecture

Industry-standard: the browser loads the page from one host and calls the API on another. CORS on the API allows the page.

```mermaid
flowchart LR
  user[Browser]
  web[Frontend · Next.js]
  api[Backend · Express]
  db[(Postgres or SQLite)]

  user -->|page URL| web
  web -->|"JSON + X-API-Key"| api
  api --> db
```

```mermaid
flowchart TB
  subgraph frontend["frontend/"]
    ui[Page and forms]
  end
  subgraph shared["packages/shared/"]
    zod[Types + Zod]
  end
  subgraph backend["backend/"]
    http[Routes]
    svc[Booking service]
    store[Store · Postgres or SQLite]
  end

  ui --> zod
  ui -->|NEXT_PUBLIC_API_BASE| http
  http --> svc --> store
  svc --> zod
```

The frontend never implements `/slots` or `/bookings`. The backend never serves the Next.js app.

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

API: [http://localhost:3001](http://localhost:3001) (set `PORT=3001` if you use the `.env.example`)

Docs (Try it out): [http://localhost:3001/docs](http://localhost:3001/docs) — Authorize with `X-API-Key` from `.env.example`.

```bash
npm run dev:frontend
```

Page: [http://localhost:3000](http://localhost:3000)

The UI reads `NEXT_PUBLIC_API_BASE` from env and loads the key from `/config.json` on the API.

---

## API

All spec routes need `X-API-Key`. `/` and `/health` do not.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/slots` | List slots, earliest first. Optional `?provider=` |
| `POST` | `/bookings` | Book a slot |
| `GET` | `/bookings/{id}` | Look up a booking |
| `DELETE` | `/bookings/{id}` | Cancel and free the slot |
| `GET` | `/bookings?email=` | That person's bookings (cursor page) |
| `POST` | `/reset` | Replace the timetable |

Errors: `{ "error": "..." }`

---

## Tests

```bash
npm test
```

HTTP checks against the **backend** only.

---

## Database

The API talks to a `Store`. Set `DATABASE_URL` and the process uses Postgres. Leave it unset and it uses SQLite at `DB_PATH`.

Tests always open SQLite (`:memory:` or a temp file). That keeps CI off a database service and still covers the HTTP contract. Postgres is the hosted choice because SQLite on a typical PaaS disk does not survive deploys, and concurrent bookings need real locking.

Request logs (method, URL, status, `X-Request-Id`) go to stdout via Pino. `/health` and `/docs` are not logged.

---

## Config

**Backend**

| Env | Default |
|---|---|
| `PORT` | `3000` (use `3001` locally so the UI can use `3000`) |
| `API_KEY` | from `.env.example` |
| `DB_PATH` | `./data/clinic.db` (used when `DATABASE_URL` is unset) |
| `DATABASE_URL` | empty — set this for Postgres; tests always use SQLite |
| `FRONTEND_ORIGIN` | `*` |
| `LOG_LEVEL` | `info` (`silent` during `npm test`) |

**Frontend**

| Env | Default |
|---|---|
| `NEXT_PUBLIC_API_BASE` | from env (`frontend/.env.development` locally) |

For a hosted split: set `NEXT_PUBLIC_API_BASE` to the API URL before building the frontend. Do not commit `.env` files.
