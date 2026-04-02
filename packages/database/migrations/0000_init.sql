-- Identity & Access
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, role TEXT, tier TEXT);
CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT, revoked BOOLEAN);

-- Agency & Leads (Gold Shore)
CREATE TABLE inquiries (id TEXT PRIMARY KEY, company TEXT, status TEXT);

-- Intelligence & Signals (Banproof)
CREATE TABLE signals (id TEXT PRIMARY KEY, type TEXT, score REAL, metadata TEXT);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY, user_id TEXT, action TEXT, ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
