import { Hono } from 'hono';

type D1Result = { results: unknown[] };

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: () => Promise<D1Result>;
  run: () => Promise<unknown>;
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type ScheduledController = { scheduledTime: number; cron: string };

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

const PARTIAL_FAILURE_STALE_MS = 1000 * 60 * 15;

app.post('/jobs/reconcile/run', async (c) => {
  const report = await runReconciliation(c.env.DB);
  return c.json(report);
});

export default {
  fetch: app.fetch,
  scheduled: async (_controller: ScheduledController, env: Bindings) => {
    await runReconciliation(env.DB);
  },
};

async function runReconciliation(db: D1Database) {
  const [duplicates, partialFailures, providerMismatches] = await Promise.all([
    detectDuplicateWrites(db),
    detectPartialFailures(db),
    detectProviderMismatches(db),
  ]);

  return {
    duplicateWrites: duplicates,
    partialFailures,
    providerMismatches,
  };
}

async function detectDuplicateWrites(db: D1Database) {
  const rows = await db
    .prepare(
      `SELECT endpoint, method, request_fingerprint, COUNT(*) AS duplicate_count,
              MIN(created_at) AS first_seen_at, MAX(updated_at) AS last_seen_at
         FROM idempotency_records
        WHERE status = 'succeeded'
        GROUP BY endpoint, method, request_fingerprint
       HAVING COUNT(*) > 1`,
    )
    .all();

  for (const row of rows.results as Array<Record<string, unknown>>) {
    await upsertReconciliationReport(db, {
      category: 'duplicate_write',
      status: 'duplicate',
      referenceId: String(row.request_fingerprint),
      details: {
        endpoint: row.endpoint,
        method: row.method,
        duplicateCount: Number(row.duplicate_count),
        firstSeenAt: Number(row.first_seen_at),
        lastSeenAt: Number(row.last_seen_at),
      },
    });
  }

  return rows.results.length;
}

async function detectPartialFailures(db: D1Database) {
  const staleThreshold = Date.now() - PARTIAL_FAILURE_STALE_MS;
  const rows = await db
    .prepare(
      `SELECT idempotency_key, endpoint, method, status, updated_at
         FROM idempotency_records
        WHERE status IN ('processing', 'failed')
          AND updated_at < ?`,
    )
    .bind(staleThreshold)
    .all();

  for (const row of rows.results as Array<Record<string, unknown>>) {
    await upsertReconciliationReport(db, {
      category: 'partial_failure',
      status: row.status === 'processing' ? 'pending' : 'failed',
      referenceId: `${String(row.endpoint)}:${String(row.method)}:${String(row.idempotency_key)}`,
      details: {
        endpoint: row.endpoint,
        method: row.method,
        idempotencyKey: row.idempotency_key,
        state: row.status,
        staleSince: Number(row.updated_at),
      },
    });
  }

  return rows.results.length;
}

async function detectProviderMismatches(db: D1Database) {
  const rows = await db
    .prepare(
      `SELECT id, message_id, idempotency_key, expected_event_count, delivered_event_count,
              status, last_provider_status, updated_at
         FROM provider_delivery_events
        WHERE channel = 'email'
          AND operation = 'send'
          AND (
            delivered_event_count <> expected_event_count
            OR status IN ('pending', 'failed', 'mismatch')
          )`,
    )
    .all();

  for (const row of rows.results as Array<Record<string, unknown>>) {
    const delivered = Number(row.delivered_event_count);
    const expected = Number(row.expected_event_count);
    const status = delivered < expected ? 'pending' : 'failed';

    await upsertReconciliationReport(db, {
      category: 'provider_mismatch',
      status,
      referenceId: String(row.id),
      details: {
        messageId: row.message_id,
        idempotencyKey: row.idempotency_key,
        expectedEvents: expected,
        deliveredEvents: delivered,
        providerStatus: row.last_provider_status,
        sourceStatus: row.status,
        updatedAt: Number(row.updated_at),
      },
    });
  }

  return rows.results.length;
}

type ReportInsert = {
  category: 'duplicate_write' | 'partial_failure' | 'provider_mismatch';
  status: 'failed' | 'duplicate' | 'pending' | 'resolved';
  referenceId: string;
  details: Record<string, unknown>;
};

async function upsertReconciliationReport(db: D1Database, report: ReportInsert) {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO reconciliation_reports
          (id, category, status, reference_id, details, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(category, reference_id)
       DO UPDATE SET status = excluded.status,
                     details = excluded.details,
                     updated_at = excluded.updated_at`,
    )
    .bind(
      crypto.randomUUID(),
      report.category,
      report.status,
      report.referenceId,
      JSON.stringify(report.details),
      now,
      now,
    )
    .run();
}
