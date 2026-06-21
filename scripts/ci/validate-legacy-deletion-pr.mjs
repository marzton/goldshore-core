#!/usr/bin/env node
import fs from 'node:fs';

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath || !fs.existsSync(eventPath)) {
  console.error('Missing GITHUB_EVENT_PATH.');
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const prBody = payload.pull_request?.body ?? '';
const changedFiles = JSON.parse(process.env.CHANGED_FILES_JSON ?? '[]');

const deletedFiles = changedFiles.filter((f) => f.status === 'removed');
if (deletedFiles.length === 0) {
  console.log('No deleted files in this PR. Gate not required.');
  process.exit(0);
}

const checklistPattern = /-\s*\[[xX]\]\s*Legacy retirement checklist completed/;
const adrPattern = /(ADR[-\s]?\d{1,4}|docs\/adr\/[^\s)]+)/i;

const errors = [];
if (!checklistPattern.test(prBody)) {
  errors.push('PR body must include checked item: "Legacy retirement checklist completed".');
}
if (!adrPattern.test(prBody)) {
  errors.push('PR body must include an ADR reference (e.g., ADR-0123 or docs/adr/...).');
}

if (errors.length > 0) {
  console.error('Deletion PR gate failed:');
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  console.error('\nDeleted files detected:');
  for (const file of deletedFiles) {
    console.error(`- ${file.filename}`);
  }
  process.exit(1);
}

console.log('Deletion PR gate passed.');
