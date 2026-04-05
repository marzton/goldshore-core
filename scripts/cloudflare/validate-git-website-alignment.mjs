#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('.', import.meta.url).pathname, '..', '..');
const alignmentPath = resolve(repoRoot, 'infra/cloudflare/git-website-alignment.json');

const data = JSON.parse(readFileSync(alignmentPath, 'utf8'));
const repos = data?.repos ?? [];

const appIndex = new Map();
const domainIndex = new Map();
const errors = [];

function isActive(status) {
  return ['active', 'canonical'].includes(status);
}

for (const repoEntry of repos) {
  if (!repoEntry.repo) {
    errors.push('Repo entry is missing `repo` name.');
    continue;
  }

  const apps = repoEntry.cloudflare_apps ?? [];
  for (const app of apps) {
    const key = `${repoEntry.repo}:${app.name}`;

    if (!app.name || !app.type || !app.domain || !app.status) {
      errors.push(`Missing required fields for ${key}.`);
      continue;
    }

    if (!['worker', 'pages'].includes(app.type)) {
      errors.push(`Invalid app type '${app.type}' for ${key}.`);
    }

    if (!isActive(app.status)) {
      continue;
    }

    const byName = appIndex.get(app.name) ?? [];
    byName.push({ repo: repoEntry.repo, domain: app.domain, status: app.status });
    appIndex.set(app.name, byName);

    const byDomain = domainIndex.get(app.domain) ?? [];
    byDomain.push({ repo: repoEntry.repo, name: app.name, status: app.status });
    domainIndex.set(app.domain, byDomain);
  }
}

if (data?.rules?.no_duplicate_app_name_across_active_apps) {
  for (const [name, entries] of appIndex.entries()) {
    if (entries.length > 1) {
      const owners = entries.map((entry) => `${entry.repo} (${entry.domain})`).join(', ');
      errors.push(`Duplicate active app name '${name}' owned by: ${owners}`);
    }
  }
}

if (data?.rules?.no_duplicate_domain_across_active_apps) {
  for (const [domain, entries] of domainIndex.entries()) {
    if (entries.length > 1) {
      const owners = entries.map((entry) => `${entry.repo}/${entry.name}`).join(', ');
      errors.push(`Duplicate active domain '${domain}' owned by: ${owners}`);
    }
  }
}

for (const domain of data?.rules?.single_canonical_api_per_domain ?? []) {
  const entries = domainIndex.get(domain) ?? [];
  if (entries.length !== 1) {
    errors.push(`Expected exactly one canonical API app for '${domain}', found ${entries.length}.`);
  }
}

console.log('Git ↔ Cloudflare website alignment report');
console.log(`- Repositories tracked: ${repos.length}`);
console.log(`- Active app names: ${appIndex.size}`);
console.log(`- Active domains: ${domainIndex.size}`);

if (errors.length > 0) {
  console.error('\nAlignment check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('\nAlignment check passed: no active-domain/app collisions detected.');
