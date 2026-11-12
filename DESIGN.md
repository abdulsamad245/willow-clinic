# Willow Clinic design and agent workflow

Willow is a clinic booking page on a strict OpenAPI API. Calm paper, leaf green, short copy. The repo tells the agent the contract; tests and reviews check the work.

## Agent workflow

```
spec/openapi.json  →  AGENTS.md + rules + skill  →  implement  →  npm test  →  /review
```

| Step | What |
|---|---|
| Spec | `spec/openapi.json`. Do not restyle paths or status codes |
| Repo law | `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursor/skills/willow-clinic/SKILL.md` |
| Prove | `npm test` (SQLite) then `npm run test:postgres` (Testcontainers) |
| Review | `/review` (Bugbot) or `/review-security` after a behaviour change |

Do not commit secrets, change spec status codes, or put Route Handlers in Next.js.

## Principles

- The page books an appointment. Not a generic dashboard.
- Polite form errors, skeletons while loading, toasts for results. No fake success.
- Mobile is a first layout (day chips, bottom sheet).
- The API is the authority. Frontend Zod is UX only.

## Visual system

| Role | Token | Value | Usage |
|---|---|---|---|
| Ink | `ink` | `#1c2418` | Body text |
| Leaf | `leaf` | `#2c5a38` | Brand bar, actions, focus |
| Paper | `paper` | `#f3efe6` | Cards and fields |
| Page | | `#f1ebe0` | Page wash |
| Skeleton | | `#e4dccf` | Loading placeholders |

- Display: **Fraunces**. Body: **Source Sans 3**.
- Custom dropdowns, not native `<select>`.
- Grid / List. Paginate slots by day.

## Surfaces

- Header: 5px leaf bar, square willow mark at title height, clinic name, subtitle under the title. Favicon matches the mark.
- Slot board: doctor filter, day chips, Grid/List.
- Book sheet: name, email, appointment, booked time, booking id.
- Lookup: one search (booking id or email). Grid/List. Click a card to see booking details. The page chooses `GET /bookings/{id}` or `GET /bookings?email=` (cursor paging under the hood).
