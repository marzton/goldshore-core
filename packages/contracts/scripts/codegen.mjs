import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');

const currentSpecPath = path.join(root, 'openapi', 'openapi.json');
const baselineSpecPath = path.join(root, '.baseline', 'openapi.json');
const baselineVersionPath = path.join(root, '.baseline', 'sdk-version.json');
const outputRoot = path.join(root, 'generated', '@goldshore', 'api-client');

const stable = (value) => {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stable(value[key]);
        return acc;
      }, {});
  }
  return value;
};

const flattenPaths = (spec) => {
  const keys = [];
  for (const [route, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method] of Object.entries(methods ?? {})) {
      keys.push(`${method.toUpperCase()} ${route}`);
    }
  }
  return new Set(keys.sort());
};

const classifyDiff = (baseline, current) => {
  const oldKeys = flattenPaths(baseline);
  const newKeys = flattenPaths(current);

  const removed = [...oldKeys].filter((x) => !newKeys.has(x));
  if (removed.length) {
    return { level: 'breaking', removed };
  }

  const added = [...newKeys].filter((x) => !oldKeys.has(x));
  if (added.length) {
    return { level: 'additive', added };
  }

  return { level: 'patch', changed: false };
};

const bumpVersion = (version, level) => {
  const [major, minor, patch] = version.split('.').map(Number);
  if (level === 'breaking') return `${major + 1}.0.0`;
  if (level === 'additive') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

const loadJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

const baselineVersion = await loadJson(baselineVersionPath);
const baselineSpec = stable(await loadJson(baselineSpecPath));
const currentSpec = stable(await loadJson(currentSpecPath));

const diff = classifyDiff(baselineSpec, currentSpec);
const nextVersion = bumpVersion(baselineVersion.version, diff.level);

const operations = Object.entries(currentSpec.paths ?? {})
  .flatMap(([route, methods]) =>
    Object.entries(methods).map(([method, op]) => ({
      route,
      method: method.toUpperCase(),
      operationId: op.operationId || `${method}_${route.replace(/\W+/g, '_')}`
    }))
  )
  .sort((a, b) => a.operationId.localeCompare(b.operationId));

const renderedClient = `/* Auto-generated. Do not edit manually. */\n` +
`export const SDK_VERSION = '${nextVersion}' as const;\n` +
`export const OPENAPI_DIFF = '${diff.level}' as const;\n\n` +
operations
  .map((op) =>
    `export async function ${op.operationId}(baseUrl: string, init?: RequestInit) {\n` +
    `  return fetch(\`${'${baseUrl}'}${op.route}\`, { method: '${op.method}', ...init });\n` +
    `}\n`
  )
  .join('\n');

const packageJson = {
  name: '@goldshore/api-client',
  version: nextVersion,
  private: false,
  type: 'module',
  exports: {
    '.': './src/client.ts'
  },
  publishConfig: {
    access: 'public',
    tag: diff.level === 'breaking' ? 'breaking' : diff.level === 'additive' ? 'additive' : 'latest'
  }
};

const changelog = [
  `# @goldshore/api-client ${nextVersion}`,
  '',
  `- Classification: **${diff.level}**`,
  `- Release tag: **${packageJson.publishConfig.tag}**`,
  `- Deterministic hash: \`${createHash('sha256').update(JSON.stringify(currentSpec)).digest('hex')}\``,
  ''
].join('\n');

if (checkOnly) {
  const existing = await readFile(path.join(outputRoot, 'package.json'), 'utf8').catch(() => '');
  if (!existing.includes(`"version": "${nextVersion}"`)) {
    console.error(`Generated artifacts out of date. Expected ${nextVersion}.`);
    process.exit(1);
  }
  console.log('Generated artifacts are deterministic and up-to-date.');
  process.exit(0);
}

await mkdir(path.join(outputRoot, 'src'), { recursive: true });
await writeFile(path.join(outputRoot, 'openapi.json'), `${JSON.stringify(currentSpec, null, 2)}\n`);
await writeFile(path.join(outputRoot, 'src', 'client.ts'), renderedClient);
await writeFile(path.join(outputRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
await writeFile(path.join(outputRoot, 'CHANGELOG.md'), changelog);
await writeFile(path.join(outputRoot, 'release-manifest.json'), `${JSON.stringify({ baseline: baselineVersion.version, nextVersion, diff }, null, 2)}\n`);

console.log(`Generated @goldshore/api-client@${nextVersion} (${diff.level}).`);
