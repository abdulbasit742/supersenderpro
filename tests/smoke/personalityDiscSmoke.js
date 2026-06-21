'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = process.cwd();
const R = (p) => require(path.join(ROOT, p));

function main() {
  const results = [];
  const ok = (name, fn) => {
    try {
      fn();
      results.push({ name, status: 'pass' });
    } catch (error) {
      results.push({ name, status: 'fail', error: error.message });
    }
  };

  const analyzer = R('lib/personalityDisc/discAnalyzer.js');
  const store = R('lib/personalityDisc/store.js');
  R('routes/personalityRoutes.js');

  ok('DISC profiles expose D I S C', () => {
    const profiles = analyzer.getDISCProfiles();
    ['D', 'I', 'S', 'C'].forEach((type) => assert.ok(profiles[type]));
  });

  ok('Dominant message classifies with a primary type', () => {
    const result = analyzer.analyzeClientPersonality({ messages: ['Need price now.', 'Send it fast.', 'Confirm today.'] });
    assert.ok(['D', 'I', 'S', 'C'].includes(result.primaryType));
    assert.strictEqual(result.messageCount, 3);
  });

  ok('WhatsApp export parser extracts messages', () => {
    const messages = analyzer.parseWhatsAppChat('16/06/2026, 10:30 - Ali: Hello\n16/06/2026, 10:31 - Ali: Need plan', 'Ali');
    assert.deepStrictEqual(messages, ['Hello', 'Need plan']);
  });

  ok('Tailored draft is preview only', () => {
    const draft = analyzer.buildTailoredReplyDraft({ customerMessage: 'Need exact terms?', offer: 'Claude Pro' });
    assert.strictEqual(draft.dryRun, true);
    assert.strictEqual(draft.liveSend, false);
    assert.ok(draft.messagePreview);
  });

  ok('Store profile memory works', () => {
    const result = analyzer.analyzeClientPersonality({ clientId: 'smoke_client', messages: ['Please explain support', 'No rush'] });
    store.upsertProfile('smoke_client', result);
    const saved = store.getProfile('smoke_client');
    assert.ok(saved);
    assert.strictEqual(saved.clientId, 'smoke_client');
  });

  const passed = results.filter((item) => item.status === 'pass').length;
  const failed = results.filter((item) => item.status === 'fail').length;
  console.log('[personality-disc:smoke] passed=%d failed=%d', passed, failed);
  results.filter((item) => item.status === 'fail').forEach((item) => console.log('   FAIL', item.name, '-', item.error));
  process.exit(failed === 0 ? 0 : 1);
}

main();
