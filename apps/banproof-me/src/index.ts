import { Hono } from 'hono';
import { authMiddleware, requirePlanTier, type GsUser } from '@goldshore/identity';
import { BanproofEngine, type ScanParams } from './workflow';
import { callCoreFromEdge } from './core-adapter';

type Bindings = {
  DB: D1Database;
  INFRA_SECRETS: KVNamespace;
  CORE_API_BASE_URL: string;
  BANPROOF_ENGINE: Workflow;
};

type Variables = {
  user: GsUser;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get('/', (c) => c.json({ service: 'banproof-me', status: 'ok' }));

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

// ── Authenticated routes ───────────────────────────────────────────────────────

const api = new Hono<{ Bindings: Bindings; Variables: Variables }>();

api.use('*', async (c, next) => {
  const secret = await c.env.INFRA_SECRETS.get('JWT_SECRET');
  if (!secret) return c.json({ error: 'Server misconfiguration' }, 500);
  return authMiddleware(secret)(c, next);
});

// Risk Radar scan — requires Pro or Agency tier
api.post('/scan', requirePlanTier('pro'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Omit<ScanParams, 'userId'>>();

  if (!body.type || !body.symbol) {
    return c.json({ error: 'type and symbol are required' }, 400);
  }

  const allowedTypes = ['risk_radar', 'political_quant'] as const;
  if (!allowedTypes.includes(body.type as (typeof allowedTypes)[number])) {
    return c.json({ error: 'Invalid type. Supported types are risk_radar and political_quant' }, 400);
  }
  const instance = await c.env.BANPROOF_ENGINE.create({
    params: { userId: user.id, type: body.type, symbol: body.symbol },
  });

  return c.json({ workflowId: instance.id, status: 'started' }, 202);
});

// Check workflow status
api.get('/scan/:id', async (c) => {
  const instance = await c.env.BANPROOF_ENGINE.get(c.req.param('id'));
  const status = await instance.status();
  return c.json(status);
});

app.route('/api', api);

export default app;
export { BanproofEngine };
