# Contributing to SuperSender Pro

The SaaS layer added on top of the monolith follows **one consistent pattern**. Match it and everything (CI, bootstrap, docs) just works.

## The convention
Each subsystem is a self-contained unit:
```
lib/<feature>/            # logic (no Express in here ideally)
routes/<feature>Routes.js # thin HTTP layer, calls lib/<feature>
scripts/wire-<feature>.js  # idempotent server.js mount (or add to lib/bootstrap/registerSubsystems)
tests/smoke/<feature>Smoke.js  # dependency-free, json driver, no network
docs/<FEATURE>.md          # what/why/how + env + verify
```

## Rules that keep us safe
1. **Tenant isolation**: all data goes through `lib/db` with a `tenantId` first arg (it throws if missing). Never read another tenant's data.
2. **Safe by default**: new sends/charges default to dry-run/warn. Going live is an explicit env flag.
3. **Never log secrets**: mask tokens/keys/passwords. Use `lib/config` redaction patterns.
4. **Don't hand-edit the 2.1MB `server.js`** for wiring - use a wire script or `registerSubsystems`. The full physical split is a separate, reviewed effort.
5. **Fail open for non-critical middleware** (rate limit, metrics) - a telemetry bug must not block traffic.

## Adding a subsystem (checklist)
- [ ] `lib/<feature>/index.js` with the core logic, tenant-scoped via `lib/db`.
- [ ] `routes/<feature>Routes.js` - thin, returns `{ success, ... }`; use `lib/http/errors` for failures.
- [ ] Register in `lib/bootstrap/registerSubsystems.js` (preferred) or a `scripts/wire-<feature>.js`.
- [ ] `tests/smoke/<feature>Smoke.js` - runs on the json driver, exits non-zero on failure (CI picks it up automatically via `scripts/ci-smoke.js`).
- [ ] `docs/<FEATURE>.md`.
- [ ] Env keys documented in `.env.production.example` + added to `lib/config` + `lib/deploy/envSchema` if required.

## Running things
```bash
node scripts/ci-smoke.js        # all smoke tests + doctors
node scripts/deploy-doctor.js   # env + wiring + GO/NO-GO
node scripts/seed-demo.js       # realistic demo tenant
node scripts/print-config.js    # resolved (redacted) config
```

## CI gates (per PR)
- `ci.yml` -> `scripts/ci-smoke.js` on Node 18 + 20 (every `tests/smoke/*Smoke.js`).
- `docker-build.yml` -> builds the prod image, bakes the commit SHA, verifies `/version`.

## Commit / PR style
Conventional-ish: `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `ci: ...`. PRs explain what + why + how to verify. Keep subsystems additive and reversible.
