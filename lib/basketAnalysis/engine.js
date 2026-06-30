// lib/basketAnalysis/engine.js
// Market-basket / product-affinity math. Given a list of "baskets" (each an
// array of product names a customer bought), it finds product PAIRS that occur
// together more than chance and scores them with the three standard association
// metrics. Pure, dependency-free, fast enough for the PC #2 overnight window.
//
// Metrics (for pair A -> B):
//   support(A,B)    = baskets containing both / total baskets
//   confidence(A->B)= baskets with both / baskets with A   ("if A, how often B")
//   lift(A,B)       = confidence(A->B) / support(B)         (>1 = real affinity)
//
// Lift is the key signal: lift > 1 means A and B sell together MORE than their
// individual popularity would predict — a genuine cross-sell, not just two
// popular items co-occurring by chance.

function round(n, dp = 3) { const f = Math.pow(10, dp); return Math.round((Number(n) || 0) * f) / f; }

// baskets: Array<Array<string>>. Returns ranked pairs + per-product recommendations.
function analyze(baskets, opts = {}) {
  const minSupportCount = opts.minSupportCount || 2; // a pair must appear at least N times
  const total = baskets.length;

  const itemCount = new Map();   // product -> # baskets containing it
  const pairCount = new Map();   // "AB" (sorted) -> # baskets containing both

  for (const raw of baskets) {
    const items = Array.from(new Set((raw || []).filter(Boolean)));
    for (const it of items) itemCount.set(it, (itemCount.get(it) || 0) + 1);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const [a, b] = [items[i], items[j]].sort();
        const key = a + '' + b;
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }

  const pairs = [];
  for (const [key, both] of pairCount.entries()) {
    if (both < minSupportCount) continue;
    const [a, b] = key.split('');
    const ca = itemCount.get(a) || 0;
    const cb = itemCount.get(b) || 0;
    const support = total ? both / total : 0;
    const confAB = ca ? both / ca : 0; // A -> B
    const confBA = cb ? both / cb : 0; // B -> A
    const supportB = total ? cb / total : 0;
    const supportA = total ? ca / total : 0;
    const lift = supportB > 0 ? confAB / supportB : 0; // symmetric for the pair
    pairs.push({
      a, b, bothCount: both,
      support: round(support),
      confidenceAtoB: round(confAB),
      confidenceBtoA: round(confBA),
      lift: round(lift),
      // best direction to pitch: whichever confidence is higher
      bestDirection: confAB >= confBA ? `${a} \u2192 ${b}` : `${b} \u2192 ${a}`,
      bestConfidence: round(Math.max(confAB, confBA)),
    });
  }
  pairs.sort((x, y) => y.lift - x.lift || y.bothCount - x.bothCount);

  // Per-product recommendation: for product P, the items most confidently bought with it.
  const recsByProduct = {};
  for (const p of pairs) {
    if (p.lift <= 1) continue; // only real affinities
    (recsByProduct[p.a] = recsByProduct[p.a] || []).push({ product: p.b, confidence: p.confidenceAtoB, lift: p.lift });
    (recsByProduct[p.b] = recsByProduct[p.b] || []).push({ product: p.a, confidence: p.confidenceBtoA, lift: p.lift });
  }
  for (const k of Object.keys(recsByProduct)) {
    recsByProduct[k].sort((x, y) => y.confidence - x.confidence).splice(5);
  }

  return {
    summary: {
      baskets: total,
      multiItemBaskets: baskets.filter((b) => new Set((b || []).filter(Boolean)).size > 1).length,
      products: itemCount.size,
      pairs: pairs.length,
      strongPairs: pairs.filter((p) => p.lift > 1).length,
    },
    pairs,
    recommendations: recsByProduct,
  };
}

module.exports = { analyze, round };
