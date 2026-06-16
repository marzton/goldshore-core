import { Jwt } from 'hono/utils/jwt';

export interface ServiceJwtClaims {
  iss: string;
  aud: string;
  sub: string;
  scope: string | string[];
  iat: number;
  exp: number;
  nbf?: number;
  jti?: string;
}

export interface ReplayCache {
  has: (jti: string) => boolean;
  add: (jti: string, expiresAtEpochSeconds: number) => void;
}

export interface VerifyServiceJwtOptions {
  secret: string;
  issuer: string;
  audience: string;
  requiredScopes?: string[];
  clockSkewSeconds?: number;
  maxTokenTtlSeconds?: number;
  replayCache?: ReplayCache;
  now?: () => number;
}

function normalizeScopes(scope: string | string[]): string[] {
  if (Array.isArray(scope)) {
    return scope;
  }
  return scope.split(' ').map((entry) => entry.trim()).filter(Boolean);
}

function assertRequiredClaims(payload: unknown): asserts payload is ServiceJwtClaims {
  const p = payload as Record<string, unknown>;
  if (
    typeof p !== 'object' ||
    p === null ||
    typeof p.iss !== 'string' ||
    typeof p.aud !== 'string' ||
    typeof p.sub !== 'string' ||
    (typeof p.scope !== 'string' && !Array.isArray(p.scope)) ||
    typeof p.iat !== 'number' ||
    typeof p.exp !== 'number'
  ) {
    throw new Error('Missing required JWT claims');
  }
}

export async function signServiceJwt(claims: ServiceJwtClaims, secret: string): Promise<string> {
  return Jwt.sign(claims, secret, 'HS256');
}

export async function verifyServiceJwt(token: string, opts: VerifyServiceJwtOptions): Promise<ServiceJwtClaims> {
  const payload = await Jwt.verify(token, opts.secret, "HS256");
  assertRequiredClaims(payload);

  const now = opts.now?.() ?? Math.floor(Date.now() / 1000);
  const skew = opts.clockSkewSeconds ?? 30;
  const maxTtl = opts.maxTokenTtlSeconds ?? 300;

  if (payload.iss !== opts.issuer) {
    throw new Error('Invalid issuer');
  }

  if (payload.aud !== opts.audience) {
    throw new Error('Invalid audience');
  }

  if (payload.exp < now - skew) {
    throw new Error('Token expired');
  }

  if (payload.iat > now + skew) {
    throw new Error('Token issued in the future');
  }

  if (payload.nbf !== undefined && payload.nbf > now + skew) {
    throw new Error('Token not active yet');
  }

  if (payload.exp - payload.iat > maxTtl) {
    throw new Error('Token TTL exceeds max allowed');
  }

  const normalizedScopes = normalizeScopes(payload.scope);
  for (const requiredScope of opts.requiredScopes ?? []) {
    if (!normalizedScopes.includes(requiredScope)) {
      throw new Error(`Missing required scope: ${requiredScope}`);
    }
  }

  if (opts.replayCache && payload.jti) {
    if (opts.replayCache.has(payload.jti)) {
      throw new Error('Replay detected');
    }
    opts.replayCache.add(payload.jti, payload.exp);
  }

  return payload;
}
