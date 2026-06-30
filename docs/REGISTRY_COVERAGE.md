# Registry Coverage Guard

A meta-test that protects the bootstrap wiring as it grows.

## What it checks (`tests/smoke/registryCoverageSmoke.js`)
1. **Every route module** referenced by `registerSubsystems` `require()`s cleanly and exports a real Express router (a function with `.use`/`.handle`). A typo'd path or a broken `module.exports` fails here in CI instead of crashing at boot.
2. **`registerSubsystems` itself loads** and exposes `registerAll`.
3. **Core lib subsystems have a smoke test** (auth, billing, sales, health, tenants, api-keys, audit, analytics, maintenance, idempotency, metrics) - so new subsystems don't ship untested.
4. **Route count sanity** (>= 19) - catches an accidental deletion from the registry.

## Why
With ~19 routers mounted from one place, the failure mode is 'someone renames a file / breaks an export and it only blows up on deploy'. This turns that into a fast CI failure on the PR.

## Run
```bash
node tests/smoke/registryCoverageSmoke.js
```
Runs automatically inside `scripts/ci-smoke.js` + GitHub Actions.
