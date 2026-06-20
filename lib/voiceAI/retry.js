// lib/voiceAI/retry.js — Retry-with-backoff helper for provider calls. Never throws to caller;
// returns {ok,result|error}. Used so a failing provider can never crash the server.

async function withRetry(fn, { attempts = 3, baseMs = 200, maxMs = 2000 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn(i);
      return { ok: true, result, attempts: i + 1 };
    } catch (e) {
      lastErr = e;
      const delay = Math.min(maxMs, baseMs * Math.pow(2, i));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return { ok: false, error: lastErr ? lastErr.message : 'unknown_error', attempts };
}

module.exports = { withRetry };
