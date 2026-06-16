export type IdempotencyEndpointPolicy = {
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headerName: 'Idempotency-Key' | 'X-Idempotency-Key';
  hashSourceFields: string[];
  ttlSeconds: number;
};

/**
 * Contract shared across API handlers, workers, and operator tooling.
 *
 * `hashSourceFields` describe where to read values from the request payload:
 * - `body.*` for JSON body fields
 * - `params.*` for URL params
 * - `query.*` for querystring fields
 * - `headers.*` for request headers
 */
export const IDEMPOTENCY_ENDPOINT_POLICIES: IdempotencyEndpointPolicy[] = [
  {
    endpoint: '/v1/inquiries',
    method: 'POST',
    headerName: 'Idempotency-Key',
    hashSourceFields: ['headers.x-user-id', 'body.source', 'body.question'],
    ttlSeconds: 60 * 60 * 24,
  },
  {
    endpoint: '/v1/signals/scan',
    method: 'POST',
    headerName: 'Idempotency-Key',
    hashSourceFields: ['headers.x-user-id', 'body.type', 'body.symbol'],
    ttlSeconds: 60 * 30,
  },
  {
    endpoint: '/v1/notifications/email/send',
    method: 'POST',
    headerName: 'X-Idempotency-Key',
    hashSourceFields: [
      'headers.x-user-id',
      'body.templateId',
      'body.recipient',
      'body.variables',
    ],
    ttlSeconds: 60 * 60 * 24 * 7,
  },
  {
    endpoint: '/v1/orders',
    method: 'POST',
    headerName: 'Idempotency-Key',
    hashSourceFields: ['headers.x-user-id', 'body.accountId', 'body.clientOrderId', 'body.order'],
    ttlSeconds: 60 * 60 * 24,
  },
];

export function getIdempotencyPolicy(endpoint: string, method: string) {
  return IDEMPOTENCY_ENDPOINT_POLICIES.find(
    (policy) => policy.endpoint === endpoint && policy.method === method,
  );
}
