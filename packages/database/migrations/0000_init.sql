-- Identity & Access
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL, tier TEXT NOT NULL);
CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, revoked BOOLEAN NOT NULL DEFAULT 0);

-- Agency & Leads (Gold Shore)
CREATE TABLE inquiries (id TEXT PRIMARY KEY, company TEXT, status TEXT);

-- Intelligence & Signals (Banproof)
CREATE TABLE signals (id TEXT PRIMARY KEY, type TEXT, score REAL, metadata TEXT);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY, user_id TEXT, action TEXT, ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
