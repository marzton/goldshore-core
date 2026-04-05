# API consumer upgrade workflow

This guide describes how to upgrade generated API clients with deterministic outputs and OpenAPI-based semantic versioning.

## 1) Generate versioned SDK artifacts

```bash
npm run contracts:codegen --workspace=packages/contracts
```

The generator compares `packages/contracts/openapi/openapi.json` with the baseline in `packages/contracts/.baseline/openapi.json` and produces:

- `packages/contracts/generated/@goldshore/api-client/package.json` (new semver)
- `packages/contracts/generated/@goldshore/api-client/CHANGELOG.md` (classification/tag)
- `packages/contracts/generated/@goldshore/api-client/src/client.ts`
- `packages/contracts/generated/@goldshore/api-client/openapi.json`

Diff classification drives release semantics:

- `breaking` => major bump, npm tag `breaking`
- `additive` => minor bump, npm tag `additive`
- `patch` => patch bump, npm tag `latest`

## 2) Publish generated client package

```bash
cd packages/contracts/generated/@goldshore/api-client
npm publish --tag "$(node -p "require('./package.json').publishConfig.tag")"
cd -
```

## 3) Upgrade goldshore-ai consumer

```bash
npm pkg set "dependencies.@goldshore/api-client=^<NEW_VERSION>" --workspace=apps/goldshore-ai
npm install
node scripts/validate-client-compat.mjs
```

CI enforces this check through `goldshore-ai-client-compat` and fails on incompatible major mismatches.

## 4) Rollback procedure

If consumer rollout fails:

```bash
git checkout -- apps/goldshore-ai/package.json package-lock.json
npm install
```

If a generated SDK release must be rolled back, republish the previous stable version tag and pin goldshore-ai back:

```bash
npm pkg set "dependencies.@goldshore/api-client=^<PREVIOUS_VERSION>" --workspace=apps/goldshore-ai
npm install
node scripts/validate-client-compat.mjs
```

Then commit rollback and redeploy.
