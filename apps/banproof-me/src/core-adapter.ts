import { DEFAULT_TELEMETRY_ERROR_CODE, TELEMETRY_HEADER_MAP, type TelemetryEnvelope } from '@goldshore/types'

interface TelemetryContext {
  traceId: string
  requestId: string
  tenant: string
  authSubject: string
}

export async function callCoreFromEdge(
  coreBaseUrl: string,
  route: string,
  init: RequestInit,
  telemetry: TelemetryContext,
): Promise<Response> {
  const startedAt = Date.now()
  const response = await fetch(`${coreBaseUrl}${route}`, {
    ...init,
    headers: {
      ...init.headers,
      [TELEMETRY_HEADER_MAP.trace_id]: telemetry.traceId,
      [TELEMETRY_HEADER_MAP.request_id]: telemetry.requestId,
      [TELEMETRY_HEADER_MAP.route]: route,
      [TELEMETRY_HEADER_MAP.tenant]: telemetry.tenant,
      [TELEMETRY_HEADER_MAP.auth_subject]: telemetry.authSubject,
    },
  })

  const envelope: TelemetryEnvelope = {
    trace_id: telemetry.traceId,
    request_id: telemetry.requestId,
    route,
    tenant: telemetry.tenant,
    auth_subject: telemetry.authSubject,
    latency_ms: Date.now() - startedAt,
    status_code: response.status,
    error_code: response.headers.get(TELEMETRY_HEADER_MAP.error_code) ?? DEFAULT_TELEMETRY_ERROR_CODE,
  }

  console.info(JSON.stringify({ event: 'edge_to_core_request', envelope }))

  return response
}
