const assert = require('assert');

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001';

async function get(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  assert(res.ok, `${path} returned ${res.status}: ${text.slice(0, 200)}`);
  return body;
}

(async () => {
  const checks = [
    ['/api/health', body => assert.strictEqual(body.app, 'SuperSender Pro')],
    ['/api/wa/status', body => assert.ok('connected' in body && 'status' in body)],
    ['/api/wa/qr', body => assert.ok('connected' in body && 'status' in body)],
    ['/', html => assert(String(html).includes('SuperSender Pro'))]
  ];

  for (const [path, validate] of checks) {
    const body = await get(path);
    validate(body);
    console.log(`ok ${path}`);
  }
  console.log('Smoke tests passed');
})().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
