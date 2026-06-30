# AI Suite Self-Test (one command + CI gate)

Every feature in the suite ships an **offline smoke test** (`tests/smoke/*Smoke.js`) that runs with no model, by pointing AI hosts at unreachable addresses and exercising each feature\'s deterministic core + graceful fallbacks. This adds the layer that runs them **all at once**: a one-command runner, a CI workflow, and an on-demand API.

## Why

You\'re shipping a lot of features fast. A single command that proves every one still boots, parses, scores, routes, and falls back correctly, in seconds, with no GPU, is what lets you keep moving without breaking what you built. It\'s the release gate.

## One command (local)

```bash
node scripts/run-ai-suite-tests.js
```

Discovers every `tests/smoke/*Smoke.js`, runs each in its own process with a timeout, and prints:

```
── AI Suite self-test ──  (28 smoke tests, timeout 30000ms)
  running supportAgentSmoke.js            ✓ PASS  10 checks, 120ms
  running ragStoreSmoke.js                ✓ PASS  11 checks, 95ms
  ...
── Summary ──
  28/28 suites passed  ·  300+ checks  ·  0 failing
  report: data/selftest/last-run.json
```

Exit code is non-zero if any suite fails, so it doubles as a pre-merge check. Flags: `--timeout <ms>`, `--filter <substr>`.

## CI gate (GitHub Actions)

`.github/workflows/ai-suite-tests.yml` runs the self-test on every push/PR to `main`. It needs **no GPU and no secrets**, the smoke tests are model-free, so it\'s fast and deterministic. The run report is uploaded as a build artifact.

## On-demand via API

Mount the self-test route (gate behind admin auth in production, it forks processes):

```js
app.use('/api/ai-suite/selftest', require('./routes/aiSuiteSelfTestRoutes'));
```

```bash
curl -X POST localhost:3000/api/ai-suite/selftest/run -H 'Content-Type: application/json' -d '{}'
# -> { ok:true, total:28, passed:28, failed:0, totalChecks:312, results:[{file,ok,ms,checks}, ...] }
curl localhost:3000/api/ai-suite/selftest/list   # list available smoke tests
```

This lets the control panel (#52) show a "run self-test" button and surface results next to live health.

## Files

- `scripts/run-ai-suite-tests.js` — the one-command runner (CI-ready).
- `.github/workflows/ai-suite-tests.yml` — CI workflow.
- `lib/aiSuite/selfTest.js` — programmatic runner (concurrency-limited).
- `routes/aiSuiteSelfTestRoutes.js` — on-demand self-test endpoint.
- `tests/smoke/selfTestSmoke.js` — a smoke test for the runner itself.

## Run everything (including this runner\'s own test)

```bash
node scripts/run-ai-suite-tests.js
```

**Zero new npm dependencies** — uses Node\'s built-in `child_process`.
