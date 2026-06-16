import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signServiceJwt } from '@goldshore/auth';
import { createCoreServiceToken, verifyIncomingServiceToken, type ApiWorkerEnv } from './edge-adapter';

const BASE_ENV: ApiWorkerEnv = {
  SERVICE_AUTH_SECRET: 'test-secret',
  SERVICE_ISSUER: 'gs-api.edge',
  CORE_AUDIENCE: 'goldshore-core.internal',
  CORE_URL: 'https://core.internal',
  SERVICE_SUBJECT: 'gs-api',
  SERVICE_SCOPES: 'core:read core:write',
  TOKEN_TTL_SECONDS: '120',
};

describe('service JWT integration', () => {
  it('rejects expired token', async () => {
    const expiredToken = await signServiceJwt(
      {
        iss: BASE_ENV.SERVICE_ISSUER,
        aud: BASE_ENV.CORE_AUDIENCE,
        sub: 'gs-api',
        scope: 'core:read',
        iat: 1_700_000_000,
        exp: 1_700_000_030,
      },
      BASE_ENV.SERVICE_AUTH_SECRET,
    );

    await assert.rejects(
      verifyIncomingServiceToken(`Bearer ${expiredToken}`, BASE_ENV, ['core:read']),
      /expired/,
    );
  });

  it('rejects wrong audience', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signServiceJwt(
      {
        iss: BASE_ENV.SERVICE_ISSUER,
        aud: 'different-audience',
        sub: 'gs-api',
        scope: 'core:read',
        iat: now,
        exp: now + 60,
      },
      BASE_ENV.SERVICE_AUTH_SECRET,
    );

    await assert.rejects(
      verifyIncomingServiceToken(`Bearer ${token}`, BASE_ENV, ['core:read']),
      /Invalid audience/,
    );
  });

  it('rejects missing required scope', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signServiceJwt(
      {
        iss: BASE_ENV.SERVICE_ISSUER,
        aud: BASE_ENV.CORE_AUDIENCE,
        sub: 'gs-api',
        scope: 'core:write',
        iat: now,
        exp: now + 60,
      },
      BASE_ENV.SERVICE_AUTH_SECRET,
    );

    await assert.rejects(
      verifyIncomingServiceToken(`Bearer ${token}`, BASE_ENV, ['core:read']),
      /Missing required scope: core:read/,
    );
  });

  it('rejects missing required claims', async () => {
    const malformedToken = await signServiceJwt(
      {
        iss: BASE_ENV.SERVICE_ISSUER,
        aud: BASE_ENV.CORE_AUDIENCE,
        sub: 'gs-api',
        // force missing scope via runtime cast
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60,
      } as never,
      BASE_ENV.SERVICE_AUTH_SECRET,
    );

    await assert.rejects(
      verifyIncomingServiceToken(`Bearer ${malformedToken}`, BASE_ENV, ['core:read']),
      /Missing required JWT claims/,
    );
  });

  it('creates tokens with required claims', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createCoreServiceToken(BASE_ENV, now);
    const claims = await verifyIncomingServiceToken(`Bearer ${token}`, BASE_ENV, ['core:read']);

    assert.equal(claims.iss, BASE_ENV.SERVICE_ISSUER);
    assert.equal(claims.aud, BASE_ENV.CORE_AUDIENCE);
    assert.equal(claims.sub, 'gs-api');
    assert.equal(typeof claims.jti, 'string');
  });
});
