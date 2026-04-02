import { Hono } from 'hono';
import { authMiddleware, requireRole, type GsUser } from '@goldshore/identity';

type Bindings = {
  DB: D1Database;
  INFRA_SECRETS: KVNamespace;
  JWT_SECRET: string;
};

type Variables = {
  user: GsUser;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get('/', (c) => c.json({ service: 'goldshore-admin', status: 'ok' }));

// ── Sudo-gated admin routes ───────────────────────────────────────────────────

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

admin.use('*', (c, next) => authMiddleware(c.env.JWT_SECRET)(c, next));
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
