#!/usr/bin/env node
import fs from 'node:fs';

const sourcePath = process.env.LEGACY_TRAFFIC_SOURCE ?? 'docs/migration/legacy-traffic.json';
const outputPath = process.env.LEGACY_TRAFFIC_REPORT_OUT ?? 'artifacts/legacy-traffic-report.md';

function safeReadJson(path) {
  if (!fs.existsSync(path)) {
    return { entries: [], warning: `Source file not found: ${path}` };
  }

  const raw = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${path}`);
  }

  return { entries: parsed, warning: null };
}

const { entries, warning } = safeReadJson(sourcePath);
const activeLegacy = entries
  .filter((row) => Number(row.avgDailyRequests7d ?? 0) > 0)
  .sort((a, b) => Number(b.avgDailyRequests7d ?? 0) - Number(a.avgDailyRequests7d ?? 0));

const now = new Date().toISOString();
const lines = [
  '# Legacy Endpoint Traffic Report',
  '',
  `Generated: ${now}`,
  `Source: \`${sourcePath}\``,
  '',
];

if (warning) {
  lines.push(`> ⚠️ ${warning}`, '');
}

if (activeLegacy.length === 0) {
  lines.push('No legacy endpoints with traffic were detected in this run.');
} else {
  lines.push('| Worker | Legacy endpoint/path | Owning team | Avg daily requests (7d) | Last seen |');
  lines.push('| --- | --- | --- | ---: | --- |');
  for (const row of activeLegacy) {
    lines.push(
      `| ${row.worker ?? 'unknown'} | ${row.path ?? 'unknown'} | ${row.owningTeam ?? 'unknown'} | ${Number(row.avgDailyRequests7d ?? 0)} | ${row.lastSeenAt ?? 'n/a'} |`
    );
  }
}

const report = `${lines.join('\n')}\n`;
fs.mkdirSync(outputPath.split('/').slice(0, -1).join('/'), { recursive: true });
fs.writeFileSync(outputPath, report, 'utf8');
console.log(report);
