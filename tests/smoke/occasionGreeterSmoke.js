// Offline smoke test for the AI Occasion Greeter.
// Forces an unreachable Ollama host so it always falls back to templates.
// Run: node tests/smoke/occasionGreeterSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// isolate data dir to a temp cwd so we don't touch real data/
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'occgreet-'));
const origCwd = process.cwd();
process.chdir(tmp);

const greeter = require(path.join(origCwd, 'lib', 'occasionGreeter', 'occasionGreeter'));

(async function () {
  // parseMonthDay variants
  assert.deepStrictEqual(greeter.parseMonthDay('2026-06-30'), { month: 6, day: 30 });
  assert.deepStrictEqual(greeter.parseMonthDay('06-30'), { month: 6, day: 30 });
  assert.deepStrictEqual(greeter.parseMonthDay('30/06'), { month: 6, day: 30 });
  assert.strictEqual(greeter.parseMonthDay('garbage'), null);

  // tenant required
  let threw = false;
  try { greeter.listContacts(); } catch (_) { threw = true; }
  assert.strictEqual(threw, true, 'missing tenantId should throw');

  const TID = 'store1';
  const today = '2026-06-30';

  greeter.upsertContact(TID, {
    phone: '+923001234567',
    name: 'Ali',
    occasions: [
      { type: 'birthday', date: '06-30', discountCode: 'BDAY10' },
      { type: 'anniversary', date: '2026-07-05' }
    ]
  });

  const contacts = greeter.listContacts(TID);
  assert.strictEqual(contacts.length, 1);
  assert.strictEqual(contacts[0].occasions.length, 2);

  // due today
  const dueToday = greeter.dueOccasions(TID, 0, today);
  assert.strictEqual(dueToday.length, 1);
  assert.strictEqual(dueToday[0].type, 'birthday');
  assert.strictEqual(dueToday[0].dueToday, true);

  // upcoming window 7 days -> birthday(0) + anniversary(5)
  const due7 = greeter.dueOccasions(TID, 7, today);
  assert.strictEqual(due7.length, 2);

  // greetings fall back to template (no model)
  const greetings = await greeter.buildGreetings(TID, 0, today);
  assert.strictEqual(greetings.length, 1);
  assert.strictEqual(greetings[0].source, 'template');
  assert.ok(/Happy Birthday Ali/.test(greetings[0].message));
  assert.ok(/BDAY10/.test(greetings[0].message));

  // remove
  assert.strictEqual(greeter.removeContact(TID, '+923001234567'), true);
  assert.strictEqual(greeter.listContacts(TID).length, 0);

  process.chdir(origCwd);
  console.log('occasionGreeter smoke: OK');
})().catch(function (e) {
  process.chdir(origCwd);
  console.error('occasionGreeter smoke: FAIL');
  console.error(e);
  process.exit(1);
});
