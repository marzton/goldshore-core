-- D1 Platform Schema — gs-platform-prod
-- Tables: users, inquiries, signals, audit_logs
-- Apply via: wrangler d1 migrations apply gs-platform-prod

CREATE TABLE IF NOT EXISTS users (
  id           TEXT    PRIMARY KEY NOT NULL,
  email        TEXT    NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,
  role         TEXT    NOT NULL DEFAULT 'user'
                       CHECK(role IN ('user', 'admin', 'sudo')),
  plan_tier    TEXT    NOT NULL DEFAULT 'free'
                       CHECK(plan_tier IN ('free', 'pro', 'agency')),
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inquiries (
  id         TEXT    PRIMARY KEY NOT NULL,
  user_id    TEXT    REFERENCES users(id),
  source     TEXT    NOT NULL DEFAULT 'goldshore-ai',
  question   TEXT    NOT NULL,
  response   TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS signals (
  id         TEXT    PRIMARY KEY NOT NULL,
  user_id    TEXT    NOT NULL REFERENCES users(id),
  type       TEXT    NOT NULL
             CHECK(type IN ('risk_radar', 'political_quant')),
  symbol     TEXT,
  sentiment  TEXT,
  odds_data  TEXT,
  result     TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT    PRIMARY KEY NOT NULL,
  user_id    TEXT,
  app        TEXT    NOT NULL,
  action     TEXT    NOT NULL,
  metadata   TEXT,
  created_at INTEGER NOT NULL
);
