import { Hono } from 'hono';
import { authMiddleware, requireRole, type GsUser } from '@goldshore/identity';
import { callCoreFromEdge } from './core-adapter';

type Bindings = {
  DB: D1Database;
  INFRA_SECRETS: KVNamespace;
  CORE_API_BASE_URL: string;
};

type Variables = {
  user: GsUser;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get('/', (c) => c.json({ service: 'goldshore-admin', status: 'ok' }));

app.get('/core/ping', async (c) => {
  if (!c.env.CORE_API_BASE_URL) return c.json({ error: 'CORE_API_BASE_URL is not configured' }, 503);

  const response = await callCoreFromEdge(c.env.CORE_API_BASE_URL, '/', { method: 'GET' }, {
    traceId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    tenant: c.req.header('x-gs-tenant') ?? 'unknown',
    authSubject: c.req.header('x-gs-auth-subject') ?? 'edge-service',
  });

  const payload = await response.text();
  return c.body(payload, response.status, { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' });
});

// ── Sudo-gated admin routes ───────────────────────────────────────────────────

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

admin.use('*', async (c, next) => {
  const secret = await c.env.INFRA_SECRETS.get('JWT_SECRET');
  if (!secret) return c.json({ error: 'Server misconfiguration' }, 500);
  return authMiddleware(secret)(c, next);
});
admin.use('*', requireRole('sudo'));

// List all users
admin.get('/users', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT id, email, role, plan_tier, created_at FROM users ORDER BY created_at DESC LIMIT 100',
  ).all();
  return c.json({ users: result.results });
});

// List audit logs (all apps)
admin.get('/audit-logs', async (c) => {
  const app = c.req.query('app');
  const query = app
    ? 'SELECT * FROM audit_logs WHERE app = ? ORDER BY created_at DESC LIMIT 200'
    : 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200';
  const result = app
    ? await c.env.DB.prepare(query).bind(app).all()
    : await c.env.DB.prepare(query).all();
  return c.json({ logs: result.results });
});

// List all Banproof signals
admin.get('/signals', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM signals ORDER BY created_at DESC LIMIT 200',
  ).all();
  return c.json({ signals: result.results });
});

// List all inquiries
admin.get('/inquiries', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 200',
  ).all();
  return c.json({ inquiries: result.results });
});

// Operator-facing reconciliation report with failed/duplicate/pending states
admin.get('/reconciliation/report', async (c) => {
  const status = c.req.query('status');

  const report = status
    ? await c.env.DB.prepare(
        `SELECT id, category, status, reference_id, details, retry_attempts,
                last_retry_at, created_at, updated_at
           FROM reconciliation_reports
          WHERE status = ?
          ORDER BY updated_at DESC
          LIMIT 500`,
      )
        .bind(status)
        .all()
    : await c.env.DB.prepare(
        `SELECT id, category, status, reference_id, details, retry_attempts,
                last_retry_at, created_at, updated_at
           FROM reconciliation_reports
          WHERE status IN ('failed', 'duplicate', 'pending')
          ORDER BY updated_at DESC
          LIMIT 500`,
      ).all();

  const counts = await c.env.DB.prepare(
    `SELECT status, COUNT(*) AS total
       FROM reconciliation_reports
      GROUP BY status`,
  ).all();

  return c.json({
    summary: counts.results,
    records: report.results,
  });
});

// Retry control for operators
admin.post('/reconciliation/report/:id/retry', async (c) => {
  const reportId = c.req.param('id');
  const now = Date.now();

  const existing = await c.env.DB.prepare(
    'SELECT id, retry_attempts FROM reconciliation_reports WHERE id = ?',
  )
    .bind(reportId)
    .first<{ id: string; retry_attempts: number }>();

  if (!existing) {
    return c.json({ error: 'Reconciliation record not found' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE reconciliation_reports
        SET retry_attempts = retry_attempts + 1,
            last_retry_at = ?,
            status = 'pending',
            updated_at = ?
      WHERE id = ?`,
  )
    .bind(now, now, reportId)
    .run();

  const updated = await c.env.DB.prepare(
    `SELECT id, category, status, reference_id, details, retry_attempts,
            last_retry_at, created_at, updated_at
       FROM reconciliation_reports
      WHERE id = ?`,
  )
    .bind(reportId)
    .first();

  return c.json({ record: updated });
});

// Update a user's role or plan tier
admin.patch('/users/:id', async (c) => {
  const body = await c.req.json<{ role?: string; plan_tier?: string }>();
  const userId = c.req.param('id');

  if (body.role) {
    await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(body.role, Date.now(), userId)
      .run();
  }
  if (body.plan_tier) {
    await c.env.DB.prepare('UPDATE users SET plan_tier = ?, updated_at = ? WHERE id = ?')
      .bind(body.plan_tier, Date.now(), userId)
      .run();
  }

  const user = await c.env.DB.prepare('SELECT id, email, role, plan_tier FROM users WHERE id = ?')
    .bind(userId)
    .first();

  return c.json({ user });
});

app.route('/admin', admin);

export default app;
