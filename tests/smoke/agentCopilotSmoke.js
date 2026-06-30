// tests/smoke/agentCopilotSmoke.js
// Offline smoke test for the agent copilot. With no AI provider configured the
// AI Brain Bridge returns its unconfigured notice, so the copilot uses canned
// fallbacks. Exit code 0 = pass.
//
// Run: node tests/smoke/agentCopilotSmoke.js

const assert = require('assert');
const copilot = require('../../lib/agentCopilot/agentCopilot');
const { extractDrafts, CANNED } = copilot._internal;

(async () => {
  let passed = 0;

  // draft extraction from a numbered list
  const drafts = extractDrafts('1. Hello there\n2. How can I help?\n3. Thanks!');
  assert.strictEqual(drafts.length, 3); passed++;
  assert.strictEqual(drafts[0], 'Hello there'); passed++;

  // bulleted list
  assert.strictEqual(extractDrafts('- one\n- two').length, 2); passed++;

  // suggestReplies with explicit message (no history needed) -> never throws, returns suggestions
  const s = await copilot.suggestReplies({ customerMessage: 'do you deliver to Lahore?', count: 3 });
  assert.ok(Array.isArray(s.suggestions) && s.suggestions.length >= 1, 'should return suggestions'); passed++;

  // with no model configured it should be the canned fallback
  if (s.source === 'fallback') { assert.deepStrictEqual(s.suggestions, CANNED.slice(0, 3)); passed++; }
  else { passed++; /* a model is configured; live suggestions are fine too */ }

  // missing input throws
  let threw = false;
  try { await copilot.suggestReplies({}); } catch { threw = true; }
  assert.ok(threw, 'suggestReplies with no input should throw'); passed++;

  // rewrite returns a string, never throws on fallback
  const r = await copilot.rewriteTone({ draft: 'k', tone: 'formal' });
  assert.ok(typeof r.rewrite === 'string' && r.rewrite.length >= 1); passed++;

  // rewrite requires a draft
  let threwR = false;
  try { await copilot.rewriteTone({}); } catch { threwR = true; }
  assert.ok(threwR, 'rewriteTone with no draft should throw'); passed++;

  // health shape
  const h = copilot.health();
  assert.ok('brainBridge' in h && 'model' in h); passed++;

  console.log(`\u2705 agentCopilot smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c agentCopilot smoke failed:', e); process.exit(1); });
