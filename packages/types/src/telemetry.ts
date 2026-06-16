export interface TelemetryEnvelope {
  trace_id: string;
  request_id: string;
  route: string;
  tenant: string;
  auth_subject: string;
  latency_ms: number;
  status_code: number;
  error_code: string;
}

export const TELEMETRY_HEADER_MAP = {
  trace_id: 'x-gs-trace-id',
  request_id: 'x-gs-request-id',
  tenant: 'x-gs-tenant',
  auth_subject: 'x-gs-auth-subject',
  route: 'x-gs-route',
  error_code: 'x-gs-error-code',
} as const;

export const DEFAULT_TELEMETRY_ERROR_CODE = 'NONE';
