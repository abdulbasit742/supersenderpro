'use strict';
// Set policy via env BEFORE requiring the runtime (policy caches env at load).
const os = require('os');
const path = require('path');
const fs = require('fs');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-rt-'));
process.env.AGENT_RUNTIME_DATA = TMP;
process.env.AGENT_RUNTIME_DRY_RUN_DEFAULT = 'false';
process.env.AGENT_RUNTIME_LIVE_ACTIONS = 'false';
process.env.AGENT_RUNTIME_BLOCKED_ACTIONS = 'social_publish,delete_files';

const test = require('node:test');
const assert = require('node:assert');

const { sanitize } = require('../contextSanitizer');
const { isPathAllowed, POLICY } = require('../policy');
const sandbox = require('../sandbox');
const queue = require('../approvalQueue');
const runtime = require('../index');

test('sanitizer redacts secret keys and token-like values', () => {
  const out = sanitize({ apiKey: 'abc', note: 'use sk-ABCDEFGHIJKLMNOPQRST now', nested: { password: 'x', ok: 'fine' } });
  assert.strictEqual(out.apiKey, '[REDACTED]');
  assert.strictEqual(out.nested.password, '[REDACTED]');
  assert.match(out.note, /\[REDACTED\]/);
  assert.strictEqual(out.nested.ok, 'fine');
});

test('path confinement: only workspace paths allowed', () => {
  assert.strictEqual(isPathAllowed(path.join(POLICY.dataDir, 'x.json')), true);
  assert.strictEqual(isPathAllowed('/etc/passwd'), false);
  assert.strictEqual(isPathAllowed('/root/.ssh/id_rsa'), false);
});

test('low-risk read is allowed (live, no approval)', () => {
  const ev = sandbox.evaluate('list_customers', { limit: 5 }, { dryRun: false });
  assert.strictEqual(ev.decision, 'allow');
});

test('high-risk action needs approval', () => {
  const ev = sandbox.evaluate('send_whatsapp_message', { to: '1', message: 'hi' }, { dryRun: false });
  assert.strictEqual(ev.decision, 'needs_approval');
});

test('blocked actionType is refused', () => {
  const ev = sandbox.evaluate('publish_social_post', { platform: 'x', content: 'y' }, { dryRun: false });
  assert.strictEqual(ev.decision, 'blocked');
});

test('dry-run never executes', () => {
  const ev = sandbox.evaluate('list_customers', {}, { dryRun: true });
  assert.strictEqual(ev.decision, 'dry_run');
});

test('unknown tool errors', () => {
  const ev = sandbox.evaluate('rm_rf_everything', {}, { dryRun: false });
  assert.strictEqual(ev.decision, 'error');
});

test('execute enqueues a draft for approval-gated action', async () => {
  const r = await sandbox.execute('send_whatsapp_message', { to: '1', message: 'hi' }, { dryRun: false, agent: 'zeroclaw', goal: 'g' });
  assert.strictEqual(r.status, 'pending_approval');
  assert.ok(r.draftId);
  const drafts = queue.list({ status: 'pending_approval' });
  assert.ok(drafts.find(d => d.id === r.draftId));
});

test('blocked execute is recorded, not run', async () => {
  const r = await sandbox.execute('publish_social_post', { platform: 'x', content: 'y' }, { dryRun: false });
  assert.strictEqual(r.status, 'blocked');
});

test('runtime.run dry-run produces a safe transcript with no real execution', async () => {
  const res = await runtime.run('give me a sales overview and follow up cold leads', { agent: 'zeroclaw', dryRun: true });
  assert.strictEqual(res.success, true);
  assert.ok(res.transcript.length > 0);
  assert.ok(res.transcript.every(t => ['dry_run', 'blocked'].includes(t.status)));
  assert.strictEqual(res.summary.executed, 0);
});

test('runtime.plan annotates every step with a decision', async () => {
  const p = await runtime.plan('list customers and send a broadcast', { agent: 'zeroclaw' });
  assert.ok(p.steps.every(s => s.evaluation && s.evaluation.decision));
});
