// tests/smoke/reviewCollectorSmoke.js
// Offline smoke test for the review collector. No model: testimonial extraction
// uses the trim fallback; classify/route logic is exercised directly. Exit 0.
//
// Run: node tests/smoke/reviewCollectorSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback
process.env.REVIEW_HAPPY_THRESHOLD = '4';
process.env.REVIEW_LINK = 'https://g.page/r/example/review';

const assert = require('assert');
const reviews = require('../../lib/reviews/reviewCollector');
const { classify, parseRating, sentimentOf } = reviews._internal;

(async () => {
  let passed = 0;
  const STORE = 'review_smoke';

  // rating parsing
  assert.strictEqual(parseRating('5 stars'), 5); passed++;
  assert.strictEqual(parseRating('I give it 2/5'), 2); passed++;
  assert.strictEqual(parseRating('\u2b50\u2b50\u2b50\u2b50'), 4); passed++;
  assert.strictEqual(parseRating('no number here'), null); passed++;

  // sentiment
  assert.strictEqual(sentimentOf('this was amazing, loved it'), 'positive'); passed++;
  assert.strictEqual(sentimentOf('terrible and broken, want refund'), 'negative'); passed++;

  // classify combines rating + sentiment
  assert.strictEqual(classify('5/5 amazing').verdict, 'happy'); passed++;
  assert.strictEqual(classify('2 stars, late and broken').verdict, 'unhappy'); passed++;
  assert.strictEqual(classify('it was okay').verdict, 'neutral'); passed++;

  // requestReview schedules + returns ask copy
  const req = reviews.requestReview({ storeId: STORE, phone: '+92300', orderId: 'o1', delayHours: 24 });
  assert.ok(req.whenISO && req.message.includes('{{name}}')); passed++;

  // happy reply -> public review route + testimonial stored
  const happy = await reviews.ingestReply({ storeId: STORE, phone: '+92300', text: '5/5 zabardast service, fast delivery, loved it!' });
  assert.strictEqual(happy.verdict, 'happy'); passed++;
  assert.strictEqual(happy.action, 'route_to_public_review'); passed++;
  assert.ok(happy.reply.includes('review'), 'happy reply should point to public review'); passed++;
  assert.ok(happy.testimonial && happy.testimonial.quote.length); passed++;

  // unhappy reply -> private escalation, NOT public
  const unhappy = await reviews.ingestReply({ storeId: STORE, phone: '+92301', text: '2 stars, item arrived broken and late' });
  assert.strictEqual(unhappy.verdict, 'unhappy'); passed++;
  assert.strictEqual(unhappy.action, 'escalate_private'); passed++;
  assert.strictEqual(unhappy.shouldEscalate, true); passed++;
  assert.ok(!/review/i.test(unhappy.reply) || /make it right/i.test(unhappy.reply), 'unhappy must not be pushed to public review'); passed++;

  // testimonials list only has the happy one
  const tlist = reviews.listTestimonials({ storeId: STORE });
  assert.ok(tlist.length >= 1 && tlist.every(t => (t.rating == null || t.rating >= 4))); passed++;

  // stats roll up
  const s = reviews.stats({ storeId: STORE });
  assert.ok(s.asked >= 2 && s.happy >= 1 && s.unhappy >= 1); passed++;
  assert.ok(s.avgRating !== null); passed++;

  // missing args throw
  let threw = false; try { await reviews.ingestReply({ storeId: STORE, phone: '+9' }); } catch { threw = true; }
  assert.ok(threw, 'ingestReply without text should throw'); passed++;

  console.log(`\u2705 reviewCollector smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c reviewCollector smoke failed:', e); process.exit(1); });
