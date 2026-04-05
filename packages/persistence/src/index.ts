import { getIdempotencyPolicy } from '@goldshore/contracts';

type D1Result = { results: unknown[] };

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: () => Promise<D1Result>;
  run: () => Promise<unknown>;
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

export type RequestFingerprintInput = {
  endpoint: string;
  method: string;
  headers?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  body?: unknown;
};

export type ResponseSnapshot = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

export type IdempotencyRecord = {
  key: string;
  endpoint: string;
  method: string;
  requestFingerprint: string;
  status: 'processing' | 'succeeded' | 'failed';
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: unknown | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export class D1IdempotencyStore {
  constructor(private readonly db: D1Database) {}

  async getByKey(key: string, endpoint: string, method: string): Promise<IdempotencyRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT idempotency_key, endpoint, method, request_fingerprint, status,
                response_status, response_headers, response_body, created_at, updated_at, expires_at
           FROM idempotency_records
          WHERE idempotency_key = ? AND endpoint = ? AND method = ? AND expires_at > ?`,
      )
      .bind(key, endpoint, method, Date.now())
      .first();

    if (!row) return null;
    return parseIdempotencyRow(row as Record<string, unknown>);
  }

  async beginRequest(input: RequestFingerprintInput, key: string): Promise<IdempotencyRecord> {
    const fingerprint = await createRequestFingerprint(input);
    const policy = getIdempotencyPolicy(input.endpoint, input.method);
    if (!policy) {
      throw new Error(`No idempotency policy for ${input.method} ${input.endpoint}`);
    }

    const now = Date.now();
    const expiresAt = now + policy.ttlSeconds * 1000;

    await this.db
      .prepare(
        `INSERT OR IGNORE INTO idempotency_records
         (idempotency_key, endpoint, method, request_fingerprint, status, created_at, updated_at, expires_at)
         VALUES (?, ?, ?, ?, 'processing', ?, ?, ?)`,
      )
      .bind(key, input.endpoint, input.method, fingerprint, now, now, expiresAt)
      .run();

    const record = await this.getByKey(key, input.endpoint, input.method);
    if (!record) throw new Error('Unable to create/read idempotency record');

    if (record.requestFingerprint !== fingerprint) {
      throw new Error('Idempotency key was already used for a different request payload');
    }

    return record;
  }

  async completeRequest(
    key: string,
    endpoint: string,
    method: string,
    response: ResponseSnapshot,
    status: 'succeeded' | 'failed' = 'succeeded',
  ) {
    await this.db
      .prepare(
        `UPDATE idempotency_records
            SET status = ?, response_status = ?, response_headers = ?, response_body = ?, updated_at = ?
          WHERE idempotency_key = ? AND endpoint = ? AND method = ?`,
      )
      .bind(
        status,
        response.status,
        JSON.stringify(response.headers),
        JSON.stringify(response.body),
        Date.now(),
        key,
        endpoint,
        method,
      )
      .run();
  }

  async markFailed(key: string, endpoint: string, method: string, errorBody: unknown) {
    return this.completeRequest(
      key,
      endpoint,
      method,
      { status: 500, headers: { 'content-type': 'application/json' }, body: errorBody },
      'failed',
    );
  }

  async getReusableResponse(
    key: string,
    endpoint: string,
    method: string,
    input: RequestFingerprintInput,
  ): Promise<ResponseSnapshot | null> {
    const record = await this.getByKey(key, endpoint, method);
    if (!record || record.status !== 'succeeded') return null;

    const fingerprint = await createRequestFingerprint(input);
    if (record.requestFingerprint !== fingerprint) {
      throw new Error('Fingerprint mismatch for idempotent replay');
    }

    if (!record.responseStatus || !record.responseHeaders) return null;
    return {
      status: record.responseStatus,
      headers: record.responseHeaders,
      body: record.responseBody,
    };
  }
}

export async function createRequestFingerprint(input: RequestFingerprintInput): Promise<string> {
  const policy = getIdempotencyPolicy(input.endpoint, input.method);
  if (!policy) {
    throw new Error(`No idempotency policy for ${input.method} ${input.endpoint}`);
  }

  const source = policy.hashSourceFields.map((field: string) => {
    const [scope, ...path] = field.split('.');
    const root = getScopedValue(scope, input);
    const value = path.length ? deepGet(root, path) : root;
    return [field, normalizeForHash(value)];
  });

  const serialized = JSON.stringify({
    endpoint: input.endpoint,
    method: input.method,
    source,
  });

  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  return [...new Uint8Array(hashBuffer)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function getScopedValue(scope: string, input: RequestFingerprintInput): unknown {
  switch (scope) {
    case 'body':
      return input.body;
    case 'params':
      return input.params ?? {};
    case 'query':
      return input.query ?? {};
    case 'headers':
      return lowercaseKeys(input.headers ?? {});
    default:
      return undefined;
  }
}

function deepGet(root: unknown, path: string[]): unknown {
  let current = root as Record<string, unknown> | undefined;
  for (const segment of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[segment] as Record<string, unknown>;
  }
  return current;
}

function lowercaseKeys(input: Record<string, string | undefined>): Record<string, string | undefined> {
  return Object.entries(input).reduce<Record<string, string | undefined>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => normalizeForHash(entry));
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, child]) => {
      acc[key] = normalizeForHash(child);
      return acc;
    }, {});
  }
  return value ?? null;
}

function parseIdempotencyRow(row: Record<string, unknown>): IdempotencyRecord {
  return {
    key: String(row.idempotency_key),
    endpoint: String(row.endpoint),
    method: String(row.method),
    requestFingerprint: String(row.request_fingerprint),
    status: row.status as IdempotencyRecord['status'],
    responseStatus: (row.response_status as number | null) ?? null,
    responseHeaders: row.response_headers ? JSON.parse(String(row.response_headers)) : null,
    responseBody: row.response_body ? JSON.parse(String(row.response_body)) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    expiresAt: Number(row.expires_at),
  };
}
