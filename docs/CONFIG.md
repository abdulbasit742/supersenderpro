# Central Config Loader

One typed, documented view of configuration instead of scattered `process.env` reads. **Non-breaking**: existing modules keep reading env directly; new code can read from here for consistency, and ops gets a single redacted report.

## Use
```js
const { config } = require('../lib/config');
if (config.data.driver === 'postgres') { /* ... */ }
const timeout = config.lifecycle.requestTimeoutMs;
```
One-off typed reads: `const { get } = require('../lib/config'); get.int('MY_KEY', 10)`.

## Namespaces
`core, auth, data, redis, billing, sales, alerts, notify, observability, security, lifecycle` - each a small object of typed values with defaults.

## Redacted report
```bash
node scripts/print-config.js
```
Prints the resolved config with **secret values masked** (`(set)` / `(unset)` for anything matching `secret|key|token|password|dsn|url`). Safe to paste into a support ticket. `deploy-doctor` can surface this too.

## Verify
```bash
node tests/smoke/configSmoke.js
```

## Note
This doesn't replace `lib/deploy/envSchema` (which validates required/cross-field rules for go/no-go) - they complement: envSchema = 'is it valid to boot?', config = 'what are the resolved values?'.
