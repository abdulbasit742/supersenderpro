# Request Timeout + Slow-Request Logging

Stops a wedged downstream (a stuck DB query, an unresponsive upstream API) from hanging a request forever - clients fail fast with a clear `503` instead.

## Middleware
- `requestTimeout(ms)` - if a handler hasn't responded within `ms` (default `REQUEST_TIMEOUT_MS`=30000), sends `503 { error:'request timed out' }`. Fires once; never double-sends if the handler later responds.
- `slowRequestLog(ms)` - logs a `slow_request` warning for requests that complete but exceed `SLOW_REQUEST_MS` (default 1000) - useful for spotting degradation before it becomes a timeout.

## Streaming is skipped
SSE, websockets, file downloads and `/metrics` are excluded by default (they're long-lived by design). Override with `requestTimeout(ms, { skip: (req) => ... })`.

## Wire
Add early in the bootstrap (before routes):
```js
const { requestTimeout, slowRequestLog } = require('./lib/http/timeout');
app.use(requestTimeout());
app.use(slowRequestLog());
```

## Env
```
REQUEST_TIMEOUT_MS=30000
SLOW_REQUEST_MS=1000
```

## Verify
```bash
node tests/smoke/timeoutSmoke.js
```
