'use strict';

/**
 * scripts/test-automation.js
 * Offline smoke test for the WATI-style automation pack:
 * quick replies, chatbot rules, office-hours logic, and the evaluation engine
 * (text / template / quick-reply responses with spintax + variables).
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.CAMPAIGN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ssp-auto-'));

const qr = require('../lib/quickReplyStore');
const templates = require('../lib/templateStore');
const botStore = require('../lib/chatbotStore');
const engine = require('../lib/chatbotEngine');

let failures = 0;
function assert(c, m) { if (c) console.log('  \u2713 ' + m); else { console.error('  \u2717 ' + m); failures++; } }
const det = () => 0;

(async () => {
  console.log('Automation (chatbot + quick replies) smoke test');

  // ---- quick replies ----
  const q = qr.createReply({ shortcut: 'price', title: 'Pricing', body: 'Our plans start at Rs 500/mo.' });
  assert(q.shortcut === '/price', 'shortcut normalized with slash');
  assert(qr.findByShortcut('/price').id === q.id, 'find by shortcut');
  assert(qr.findByShortcut('PRICE').id === q.id, 'shortcut case-insensitive');
  assert(qr.listReplies().length === 1, 'quick reply listed');

  // ---- template for rule response ----
  const t = templates.createTemplate({ name: 'Welcome', body: 'Hi {{name}}, {welcome|hello}!' });

  // ---- chatbot settings ----
  botStore.updateSettings({ enabled: true, defaultReply: 'Sorry, I did not get that.' });
  assert(botStore.getSettings().defaultReply === 'Sorry, I did not get that.', 'default reply saved');

  // ---- rules ----
  const r1 = botStore.createRule({
    name: 'Greeting', priority: 10,
    match: { type: 'contains', keywords: ['hi', 'hello'] },
    response: { type: 'template', templateId: t.id },
  });
  const r2 = botStore.createRule({
    name: 'Price', priority: 20,
    match: { type: 'equals', keywords: ['price'] },
    response: { type: 'quickReply', quickReplyId: q.id },
  });
  assert(botStore.listRules().length === 2, 'two rules created');

  // ---- evaluation: keyword -> template ----
  const e1 = engine.evaluate('hello there', { vars: { name: 'Ali' }, rng: det });
  assert(e1.matched && e1.source === 'rule' && e1.ruleId === r1.id, 'greeting rule matched');
  assert(e1.reply === 'Hi Ali, welcome!', 'template response rendered with vars+spintax');

  // ---- evaluation: equals -> quick reply ----
  const e2 = engine.evaluate('price', { rng: det });
  assert(e2.matched && e2.reply.includes('Rs 500'), 'quick-reply response rendered');

  // 'price list' should NOT match the equals rule, falls to default
  const e3 = engine.evaluate('price list please', { rng: det });
  assert(e3.source === 'default', 'non-exact equals falls through to default');

  // ---- priority ordering ----
  botStore.createRule({ name: 'Catch hi-prio', priority: 5, match: { type: 'contains', keywords: ['hello'] }, response: { type: 'text', text: 'high priority' } });
  const e4 = engine.evaluate('hello', { rng: det });
  assert(e4.reply === 'high priority', 'lower priority number wins');

  // ---- office hours ----
  const oh = { enabled: true, start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] };
  const monday10 = new Date('2026-06-15T10:00:00'); // Monday
  const monday20 = new Date('2026-06-15T20:00:00'); // Monday evening
  const sunday10 = new Date('2026-06-14T10:00:00'); // Sunday
  assert(engine.isWithinOfficeHours(oh, monday10) === true, 'within office hours');
  assert(engine.isWithinOfficeHours(oh, monday20) === false, 'after hours blocked');
  assert(engine.isWithinOfficeHours(oh, sunday10) === false, 'weekend blocked');
  assert(engine.isWithinOfficeHours({ enabled: false }, monday20) === true, 'hours disabled = always open');

  botStore.updateSettings({ officeHours: { ...oh, outsideMessage: 'We are closed now.' } });
  const e5 = engine.evaluate('hello', { now: monday20, rng: det });
  assert(e5.source === 'office-hours' && e5.reply === 'We are closed now.', 'outside-hours message returned');

  // ---- disabled bot ----
  botStore.updateSettings({ enabled: false });
  assert(engine.evaluate('hello', { rng: det }).source === 'disabled', 'disabled bot returns nothing');

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
