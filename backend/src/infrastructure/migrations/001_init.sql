CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  start TEXT NOT NULL,
  "end" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_per_slot
  ON bookings(slot_id) WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS bookings_email_created
  ON bookings(email, created_at, id);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  body_hash TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_attempts (
  email TEXT NOT NULL,
  attempted_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_attempts_email_time
  ON rate_attempts(email, attempted_at);
