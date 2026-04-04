import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── Enums (SQLite CHECK constraints) ──────────────────────────────────────────

export const roleEnum = ['user', 'admin', 'sudo'] as const;
export const planTierEnum = ['free', 'pro', 'agency'] as const;
export const signalTypeEnum = ['risk_radar', 'political_quant'] as const;

// ── Tables ────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: roleEnum }).notNull().default('user'),
  planTier: text('plan_tier', { enum: planTierEnum }).notNull().default('free'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const inquiries = sqliteTable('inquiries', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  source: text('source').notNull().default('goldshore-ai'),
  question: text('question').notNull(),
  response: text('response'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const signals = sqliteTable('signals', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type', { enum: signalTypeEnum }).notNull(),
  symbol: text('symbol'),
  sentiment: text('sentiment'),
  oddsData: text('odds_data'),
  result: text('result'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  app: text('app').notNull(),
  action: text('action').notNull(),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
