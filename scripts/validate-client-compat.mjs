import { readFile } from 'node:fs/promises';

const baseline = JSON.parse(await readFile('packages/contracts/.baseline/sdk-version.json', 'utf8'));
const appPkg = JSON.parse(await readFile('apps/goldshore-ai/package.json', 'utf8'));

const dep = appPkg.dependencies?.['@goldshore/api-client'];
if (!dep) {
  console.error('Missing @goldshore/api-client dependency in apps/goldshore-ai/package.json');
  process.exit(1);
}

const major = (value) => {
  const clean = value.replace(/^[^0-9]*/, '');
  return Number(clean.split('.')[0]);
};

const baselineMajor = major(baseline.version);
const depMajor = major(dep);

if (baselineMajor !== depMajor) {
  console.error(`Incompatible SDK major detected: baseline=${baseline.version}, goldshore-ai=${dep}`);
  process.exit(1);
}

console.log(`SDK major compatibility OK: baseline=${baseline.version}, goldshore-ai=${dep}`);
