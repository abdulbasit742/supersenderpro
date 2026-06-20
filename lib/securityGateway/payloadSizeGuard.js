// lib/securityGateway/payloadSizeGuard.js — Reject oversized payloads (preview by default).
function check(payload, maxBytes = 100000) {
  let bytes = 0;
  try { bytes = Buffer.byteLength(typeof payload === 'string' ? payload : JSON.stringify(payload || {}), 'utf8'); } catch (_e) { bytes = 0; }
  const tooLarge = bytes > maxBytes;
  return { bytes, maxBytes, tooLarge, ok: !tooLarge };
}
module.exports = { check };
