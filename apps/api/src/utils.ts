export function escapeJson(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
