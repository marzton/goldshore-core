/* Auto-generated. Do not edit manually. */
export const SDK_VERSION = '1.5.0' as const;
export const OPENAPI_DIFF = 'additive' as const;

export async function getHealth(baseUrl: string, init?: RequestInit) {
  return fetch(`${baseUrl}/health`, { method: 'GET', ...init });
}

export async function listPositions(baseUrl: string, init?: RequestInit) {
  return fetch(`${baseUrl}/positions`, { method: 'GET', ...init });
}
