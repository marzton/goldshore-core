-- Idempotency records with request fingerprint + response snapshot
CREATE TABLE IF NOT EXISTS idempotency_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('processing', 'succeeded', 'failed')) DEFAULT 'processing',
  response_status INTEGER,
  response_headers TEXT,
  response_body TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(idempotency_key, endpoint, method)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
  ON idempotency_records(expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_fingerprint
  ON idempotency_records(endpoint, method, request_fingerprint);

-- Provider delivery tracking for reconciliation (email/send events)
CREATE TABLE IF NOT EXISTS provider_delivery_events (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  operation TEXT NOT NULL,
  message_id TEXT NOT NULL,
  idempotency_key TEXT,
  expected_event_count INTEGER NOT NULL DEFAULT 1,
  delivered_event_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('pending', 'delivered', 'mismatch', 'failed')) DEFAULT 'pending',
  last_provider_status TEXT,
  payload TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_delivery_status
  ON provider_delivery_events(channel, operation, status);

-- Reconciliation report snapshots for operator-facing dashboards
CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('duplicate_write', 'partial_failure', 'provider_mismatch')),
  status TEXT NOT NULL CHECK(status IN ('failed', 'duplicate', 'pending', 'resolved')),
  reference_id TEXT NOT NULL,
  details TEXT,
  retry_attempts INTEGER NOT NULL DEFAULT 0,
  last_retry_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(category, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_status
  ON reconciliation_reports(status, category, updated_at DESC);
