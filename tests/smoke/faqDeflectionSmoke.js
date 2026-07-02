'use strict';
/**
 * Offline smoke test for the AI FAQ Deflection engine.
 *
 * Runs with NO network / NO model. Forces any AI host to an unreachable
 * address so the optional phrasing path must gracefully fall back to the
 * canned answer. Exercises: seeding, deterministic matching, deflection,
 * escalation, and stats. Exits non-zero on failure (CI gate friendly).
 */

process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.LLM_HUB_DRY_RUN = process.env.LLM_HUB_DRY_RUN || 'true';

const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

// isolate storage in a temp cwd so we don't pollute real data/
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'faqdefl-'));
const origCwd = process.cwd();
process.chdir(tmp);

const engine = require('../../lib/faqDeflection/faqDeflection');

let failed = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok  - ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL- ${name}`);
  }
}

(async () => {
  const T = 'tenantA';

  // seed a few common WhatsApp-commerce FAQs
  engine.seedFaqs(T, [
    {
      question: 'Do you offer cash on delivery?',
      answer: 'Yes! We offer Cash on Delivery across Pakistan. You pay the rider when your order arrives.',
      keywords: ['cod', 'cash on delivery', 'cash'],
      aliases: ['cod available', 'do you have cod'],
      category: 'payments'
    },
    {
      question: 'What are your delivery charges?',
      answer: 'Delivery is Rs.200 flat nationwide, and FREE on orders above Rs.3000.',
      keywords: ['delivery charges', 'shipping cost', 'shipping fee', 'delivery fee'],
      aliases: ['how much is delivery', 'shipping charges'],
      category: 'shipping'
    },
    {
      question: 'What are your working hours?',
      answer: 'We reply daily from 10am to 8pm. Messages after hours are answered the next morning.',
      keywords: ['working hours', 'timing', 'open', 'hours'],
      aliases: ['when are you open', 'what time do you open'],
      category: 'general'
    }
  ]);

  check('seeded 3 faqs', engine.listFaqs(T).length === 3);

  // normalization sanity
  const { normalize, tokenize } = engine._internal;
  check('normalize strips punctuation/case', normalize('Do YOU have COD??') === 'do you have cod');
  check('tokenize drops stopwords', !tokenize('do you have cod').includes('you'));

  // 1) keyword + alias match -> deflect (COD)
  const r1 = await engine.deflect(T, 'bhai COD available hai?');
  check('cod question deflected', r1.deflected === true);
  check('cod answer returned', /Cash on Delivery/i.test(r1.answer || ''));
  check('cod no model -> not phrased (fallback)', r1.phrased === false);
  check('cod escalate=false', r1.escalate === false);

  // 2) shipping cost question -> deflect
  const r2 = await engine.deflect(T, 'how much is delivery charges?');
  check('shipping question deflected', r2.deflected === true);
  check('shipping answer correct', /Rs\.?200/i.test(r2.answer || ''));

  // 3) working hours -> deflect
  const r3 = await engine.deflect(T, 'what time do you open');
  check('hours question deflected', r3.deflected === true);
  check('hours high confidence (alias)', r3.confidence === 'high');

  // 4) unrelated question -> escalate
  const r4 = await engine.deflect(T, 'my parcel arrived broken and I want a refund urgently');
  check('unrelated question escalates', r4.escalate === true && r4.deflected === false);
  check('escalated answer is null', r4.answer === null);

  // 5) match() is side-effect free vs deflect()
  const statsBefore = engine.getStats(T);
  engine.match(T, 'cod?');
  const statsAfter = engine.getStats(T);
  check('match() has no side effects on stats', statsBefore.seen === statsAfter.seen);

  // 6) stats reflect activity
  const stats = engine.getStats(T);
  check('stats seen == 4', stats.seen === 4);
  check('stats deflected == 3', stats.deflected === 3);
  check('stats escalated == 1', stats.escalated === 1);
  check('deflection rate == 0.75', stats.deflectionRate === 0.75);

  // 7) tenant isolation: missing tenantId throws
  let threw = false;
  try { await engine.deflect('', 'hi'); } catch (_) { threw = true; }
  check('missing tenantId throws', threw);

  // 8) separate tenant has its own empty store
  check('tenantB isolated/empty', engine.listFaqs('tenantB').length === 0);

  // 9) health
  const h = engine.health();
  check('health ok', h.ok === true && h.feature === 'ai-faq-deflection');

  // cleanup
  process.chdir(origCwd);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* ignore */ }

  if (failed) {
    console.error(`\nFAQ Deflection smoke: ${failed} check(s) FAILED`);
    process.exit(1);
  }
  console.log('\nFAQ Deflection smoke: ALL PASSED');
})();
