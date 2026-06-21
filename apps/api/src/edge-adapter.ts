import { randomUUID } from 'node:crypto';
import { signServiceJwt, verifyServiceJwt, type ServiceJwtClaims } from '@goldshore/auth';

export interface ApiWorkerEnv {
  SERVICE_AUTH_SECRET: string;
  SERVICE_ISSUER: string;
  CORE_AUDIENCE: string;
  CORE_URL: string;
  SERVICE_SUBJECT?: string;
  SERVICE_SCOPES?: string;
  TOKEN_TTL_SECONDS?: string;
}

export async function createCoreServiceToken(env: ApiWorkerEnv, nowEpochSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const ttlSeconds = Number(env.TOKEN_TTL_SECONDS ?? '120');
  const claims: ServiceJwtClaims = {
    iss: env.SERVICE_ISSUER,
    aud: env.CORE_AUDIENCE,
    sub: env.SERVICE_SUBJECT ?? 'gs-api',
    scope: env.SERVICE_SCOPES ?? 'core:read core:write',
    iat: nowEpochSeconds,
    exp: nowEpochSeconds + ttlSeconds,
    jti: randomUUID(),
  };

  return signServiceJwt(claims, env.SERVICE_AUTH_SECRET);
}

export async function forwardRequestToCore(request: Request, env: ApiWorkerEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const token = await createCoreServiceToken(env);
  const url = new URL(request.url);
  const upstream = new URL(url.pathname + url.search, env.CORE_URL).toString();

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-Goldshore-Caller', env.SERVICE_SUBJECT ?? 'gs-api');

  return fetchImpl(
    new Request(upstream, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'follow',
    }),
  );
}

export async function verifyIncomingServiceToken(
  authHeader: string | null,
  env: ApiWorkerEnv,
  requiredScopes: string[] = ['core:read'],
): Promise<ServiceJwtClaims> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing Bearer token');
  }

  const token = authHeader.slice('Bearer '.length);
  return verifyServiceJwt(token, {
    secret: env.SERVICE_AUTH_SECRET,
    issuer: env.SERVICE_ISSUER,
    audience: env.CORE_AUDIENCE,
    requiredScopes,
    clockSkewSeconds: 30,
    maxTokenTtlSeconds: Number(env.TOKEN_TTL_SECONDS ?? '120'),
  });
}
