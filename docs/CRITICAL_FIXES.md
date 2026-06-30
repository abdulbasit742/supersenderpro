# Critical Fixes — server hang + payments

This branch ships three safe, self-contained code fixes (`lib/webhookDispatcher.js`,
`lib/stockMutex.js`, `lib/txnStore.js`). The remaining fixes touch `server.js`, which is a single
2.1 MB file — too large to safely auto-rewrite. Apply the surgical patches below locally (or hand
them to the coding agent), then run `npm start` and confirm the page loads instantly.

---

## 🔴 #1 — THE SERVER HANG (highest priority)

**Symptom:** server "doesn't load", page is unresponsive, especially on the Windows/eduroam box
behind the proxy.

**Root cause:** Node is single-threaded. On startup, `resolveBaileysVersion()` calls
`fetchWhatsAppVersionViaProxy()`, which runs **synchronous** `execFileSync('curl.exe', ...)` with a
20s connect timeout. While that blocking call waits (and behind the eduroam proxy it often hangs),
the **entire event loop is frozen** — no page, no API responds. Two concrete bugs:

1. `curl.exe` is hard-coded → on the Linux box (PC #2) there is no `curl.exe`, so it always fails.
2. The call is synchronous and on the boot path → it blocks the HTTP server from accepting requests.

### Fix 1a — make curl cross-platform + shorter timeout

Find `fetchTextWithCurl(url)` and replace the binary + timeout:

```js
// BEFORE
function fetchTextWithCurl(url) {
  const proxyUrl = getOutboundProxyUrl();
  const args = ['-fsSL', '--connect-timeout', '20'];
  if (proxyUrl) args.push('-x', proxyUrl);
  args.push(url);
  try {
    return execFileSync('curl.exe', args, {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024
    });
  } catch (error) {
    return '';
  }
}

// AFTER
function fetchTextWithCurl(url) {
  const proxyUrl = getOutboundProxyUrl();
  const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const args = ['-fsSL', '--connect-timeout', '5', '--max-time', '8'];
  if (proxyUrl) args.push('-x', proxyUrl);
  args.push(url);
  try {
    return execFileSync(curlBin, args, {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024
    });
  } catch (error) {
    return '';
  }
}
```

### Fix 1b — never block the boot path (the real freeze fix)

Make the HTTP server start listening FIRST, then resolve the WhatsApp version in the background.
Whatever the current boot sequence looks like, the rule is: **`server.listen(...)` must run before
any WhatsApp/Baileys version resolution, and that resolution must not be `await`-ed on the boot
path.**

```js
// Start accepting requests immediately so the dashboard/API are never blocked by WA startup.
server.listen(PORT, () => {
  console.log(`[Server] listening on ${PORT}`);
});

// Initialise WhatsApp AFTER the server is up, off the critical path.
setImmediate(() => {
  initWhatsApp().catch(err => console.error('[WA] init failed (server still up):', err.message));
});
```

And inside the WA init, keep the version lookup off the event loop. `execFileSync` is the worst
offender — prefer the async version so it can never freeze the loop:

```js
// Replace execFileSync with execFile (async) inside fetchTextWithCurl, or wrap the whole
// fetchWhatsAppVersionViaProxy() in a worker/child process. At minimum, the short --max-time 8
// from Fix 1a caps the freeze at 8s instead of hanging indefinitely.
```

> After 1a + 1b: the page loads instantly even if the proxy is down; WhatsApp simply connects a few
> seconds later (or retries) without taking the whole server down.

---

## 🟠 #2 — Per-request synchronous file reads

MCP tools and data access (`customers`, `orders`, etc.) use `fs.readFileSync` on every call. With
large JSON files this blocks the event loop on each API hit → freezes under load. Migrate hot reads
to `fs.promises.readFile` (async) and cache parsed results in memory with an mtime check (the same
pattern already used for `readCachedIndexHtml`).

---

## 🔴 #3 — Verify payment webhook actually fulfills the order

In `routes/paymentGatewayRoutes.js` the `/webhook/:gateway` handler verifies the signature and
returns `{ ok: true }` — but there is no visible order-fulfillment/subscription-activation step here.
Confirm that `gw.verifyWebhook(...)` (in `lib/paymentGateway`) marks the order paid / activates the
plan. If it doesn't, payments succeed but customers get nothing. Add the fulfillment call after a
verified webhook.

## 🟠 #4 — Webhook raw-body vs global JSON parser

`/webhook/:gateway` uses `express.raw()` for HMAC verification, but `server.js` mounts a global
`express.json({ limit: '50mb' })` early. If the global parser runs before the payment route, it
consumes the body and the HMAC signature check will ALWAYS fail. Ensure the payment webhook route is
registered with its `express.raw()` BEFORE the global `express.json()` middleware, or exclude that
path from the global parser.

---

## Already fixed in this branch

- **`lib/webhookDispatcher.js`** — SSRF guard: blocks private/loopback/link-local/metadata targets,
  re-validates resolved IPs at dispatch time (defeats DNS rebinding), `redirect: 'manual'`.
- **`lib/stockMutex.js`** — per-key locks (no more global serialization) + `runWithLock()` that always
  releases; documented as single-process only.
- **`lib/txnStore.js`** — transactions persisted to `data/txn_store.json` so restarts don't drop
  pending payments; same API.

> Note on multi-instance: `stockMutex` and `txnStore` are still per-process. If you scale beyond one
> replica, move both to Redis/Postgres. Tracked as a follow-up.
