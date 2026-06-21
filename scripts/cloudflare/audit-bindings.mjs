#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('.', import.meta.url).pathname, '..', '..');
const bindingsPath = resolve(repoRoot, 'infra/bindings.json');

const appConfigs = [
  { name: 'goldshore-admin', path: 'apps/admin-dashboard/wrangler.toml' },
  { name: 'goldshore-ai', path: 'apps/goldshore-ai/wrangler.toml' },
  { name: 'banproof-me', path: 'apps/banproof-me/wrangler.toml' }
];

const bindings = JSON.parse(readFileSync(bindingsPath, 'utf8'));
const expectedD1Id = bindings?.d1?.primary?.id;
const expectedKvId = bindings?.kv?.primary?.id;

function getFirstMatch(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : null;
}

function statusLabel(ok) {
  return ok ? 'OK' : 'MISMATCH';
}

let hasMismatch = false;

console.log('Cloudflare Binding Audit (goldshore-core)');
console.log(`- Canonical D1 (${bindings?.d1?.primary?.name ?? 'unknown'}): ${expectedD1Id ?? 'missing'}`);
console.log(`- Canonical KV (${bindings?.kv?.primary?.name ?? 'unknown'}): ${expectedKvId ?? 'missing'}`);
console.log('');

for (const config of appConfigs) {
  const configPath = resolve(repoRoot, config.path);
  const toml = readFileSync(configPath, 'utf8');

  const d1Id = getFirstMatch(toml, /database_id\s*=\s*"([^"]+)"/);
  const kvIdNormalized = getFirstMatch(toml, /\[\[(?:env\.[^.]+\.)?kv_namespaces\]\][\s\S]*?id\s*=\s*"([^"]+)"/m);

  const d1Match = d1Id === expectedD1Id;
  const kvMatch = kvIdNormalized === expectedKvId;

  if (!d1Match || (kvIdNormalized && !kvMatch)) {
    hasMismatch = true;
  }

  console.log(`${config.name} (${config.path})`);
  console.log(`  D1 id: ${d1Id ?? 'not set'} [${statusLabel(d1Match)}]`);
  if (kvIdNormalized) {
    console.log(`  KV id: ${kvIdNormalized} [${statusLabel(kvMatch)}]`);
  } else {
    console.log('  KV id: not set [SKIPPED]');
  }
  console.log('');
}

if (hasMismatch) {
  console.error('Audit failed: one or more app bindings are out of sync with infra/bindings.json.');
  process.exit(1);
}

console.log('Audit passed: app bindings are aligned with infra/bindings.json.');
