import type { Context, MiddlewareHandler, Next } from 'hono';
import { sign, verify } from 'hono/jwt';

export type Role = 'user' | 'admin' | 'sudo';
export type PlanTier = 'free' | 'pro' | 'agency';

export interface GsUser {
  id: string;
  email: string;
  role: Role;
  plan_tier: PlanTier;
  exp?: number;
}

// ── JWT helpers ────────────────────────────────────────────────────────────────

export async function signJwt(
  payload: Omit<GsUser, 'exp'> & { exp?: number },
  secret: string,
): Promise<string> {
  return sign(payload, secret);
}

export async function verifyJwt(token: string, secret: string): Promise<GsUser> {
  const payload = await verify(token, secret);
  return payload as unknown as GsUser;
}

// ── Auth middleware ────────────────────────────────────────────────────────────

/**
 * Validates the Bearer JWT in the Authorization header and attaches
 * the decoded user to `c.var.user` for downstream handlers.
 */
export function authMiddleware(secret: string): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.slice(7);
    try {
      const user = await verifyJwt(token, secret);
      c.set('user', user);
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
}

// ── RBAC guard ─────────────────────────────────────────────────────────────────

const ROLE_LEVELS: Record<Role, number> = { user: 0, admin: 1, sudo: 2 };

/**
 * Requires the authenticated user to have at least `minRole`.
 * Must be used after `authMiddleware`.
 */
export function requireRole(minRole: Role): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as GsUser | undefined;
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (ROLE_LEVELS[user.role] < ROLE_LEVELS[minRole]) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}

// ── Plan-tier guard ────────────────────────────────────────────────────────────

const TIER_LEVELS: Record<PlanTier, number> = { free: 0, pro: 1, agency: 2 };

/**
 * Requires the authenticated user to be on at least `minTier`.
 * Must be used after `authMiddleware`.
 */
export function requirePlanTier(minTier: PlanTier): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as GsUser | undefined;
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (TIER_LEVELS[user.plan_tier] < TIER_LEVELS[minTier]) {
      return c.json({ error: 'Plan upgrade required' }, 403);
    }
    await next();
  };
}
