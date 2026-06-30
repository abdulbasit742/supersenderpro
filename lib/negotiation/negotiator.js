// lib/negotiation/negotiator.js
// ────────────────────────────────────────────────────────────────────
// AI Price Negotiation Assistant. Bargaining is the norm on WhatsApp in this
// market — "last price?", "thora kam karo". This lets the bot haggle for you,
// but ALWAYS inside owner-set limits: a per-product floor it will never cross,
// a max discount %, and a max number of rounds. The counter-offer math is fully
// deterministic (so the floor is mathematically guaranteed); the AI Brain Bridge
// (self-hosted Ollama) only phrases the reply to sound human.
//
// State is tracked per (contact, product): current offer, rounds used, status.
// Deterministic phrasing fallback so it works with no model. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[negotiation] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.NEGOTIATION_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'negotiation');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const policyFile = (storeId) => path.join(DATA_DIR, `${storeId}_policy.json`);
const stateFile = (storeId) => path.join(DATA_DIR, `${storeId}_state.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[negotiation] write failed:', e.message); } }

function norm(name) { return String(name || '').toLowerCase().trim().replace(/\s+/g, ' '); }

// ── Policy: per-product negotiation limits ────────────────────────────
const DEFAULT_POLICY = {
  // global defaults applied when a product has no explicit entry
  defaults: { maxDiscountPct: 10, maxRounds: 3, acceptWithinPct: 2 },
  products: {} // norm(name) -> { listPrice, floor?, maxDiscountPct?, maxRounds?, acceptWithinPct? }
};

function getPolicy(storeId) { return readJSON(policyFile(storeId), JSON.parse(JSON.stringify(DEFAULT_POLICY))); }
function setPolicy(storeId, updates = {}) {
  const cur = getPolicy(storeId);
  const merged = {
    defaults: { ...cur.defaults, ...(updates.defaults || {}) },
    products: { ...cur.products, ...(updates.products || {}) }
  };
  // normalize product keys
  const np = {};
  for (const k of Object.keys(merged.products)) np[norm(k)] = merged.products[k];
  merged.products = np;
  writeJSON(policyFile(storeId), merged);
  return merged;
}

/** Resolve effective limits for a product (explicit entry merged over defaults). */
function limitsFor(policy, productName, listPriceOverride) {
  const p = policy.products[norm(productName)] || {};
  const d = policy.defaults || {};
  const listPrice = listPriceOverride != null ? listPriceOverride : p.listPrice;
  const maxDiscountPct = p.maxDiscountPct != null ? p.maxDiscountPct : d.maxDiscountPct;
  const acceptWithinPct = p.acceptWithinPct != null ? p.acceptWithinPct : d.acceptWithinPct;
  const maxRounds = p.maxRounds != null ? p.maxRounds : d.maxRounds;
  // floor: explicit, else derived from maxDiscountPct
  let floor = p.floor;
  if (floor == null && listPrice != null) floor = Math.round(listPrice * (1 - (maxDiscountPct || 0) / 100));
  return { listPrice, floor, maxDiscountPct, acceptWithinPct, maxRounds };
}

// ── State per (contact, product) ───────────────────────────────────
function stateKey(phone, productName) { return `${phone}::${norm(productName)}`; }
function readState(storeId) { return readJSON(stateFile(storeId), {}); }
function writeState(storeId, d) { writeJSON(stateFile(storeId), d); }

// ── Deterministic counter-offer engine (the safety-critical part) ───────────
/**
 * Decide the next move given the customer's offer. Pure + deterministic.
 * Guarantees: counter >= floor always; never accepts below floor; respects rounds.
 * @returns {{ decision:'accept'|'counter'|'reject'|'hold_at_floor', price, floor, listPrice, roundsLeft }}
 */
function decide({ listPrice, floor, customerOffer, round, maxRounds, acceptWithinPct }) {
  const roundsLeft = Math.max(0, maxRounds - round);
  // No price configured -> cannot negotiate, hold list.
  if (listPrice == null || floor == null) return { decision: 'reject', price: listPrice, floor, listPrice, roundsLeft };

  // Accept if the offer meets/clears floor AND is within acceptWithinPct of what we'd counter,
  // i.e. the customer is at or above floor.
  if (customerOffer != null && customerOffer >= floor) {
    // if they're within acceptWithinPct of list, just accept; otherwise accept at their offer (>= floor)
    return { decision: 'accept', price: Math.min(customerOffer, listPrice), floor, listPrice, roundsLeft };
  }

  // Out of rounds -> final stance at floor (take-it-or-leave-it), never below.
  if (roundsLeft <= 0) return { decision: 'hold_at_floor', price: floor, floor, listPrice, roundsLeft };

  // Counter: meet partway between the customer's (below-floor) offer and our current anchor,
  // but clamp to >= floor. Anchor walks down from list toward floor across rounds.
  const anchor = Math.round(listPrice - (listPrice - floor) * (round / Math.max(1, maxRounds)));
  let counter = customerOffer != null ? Math.round((anchor + Math.max(customerOffer, floor)) / 2) : anchor;
  counter = Math.max(floor, Math.min(listPrice, counter)); // HARD floor clamp
  return { decision: 'counter', price: counter, floor, listPrice, roundsLeft };
}

// ── Phrasing ───────────────────────────────────────────────
function templateReply(decision, price, product) {
  const c = CURRENCY();
  switch (decision) {
    case 'accept': return `Done! \u2705 I can do ${product} for ${c} ${price}. Shall I confirm the order?`;
    case 'counter': return `I can\'t go that low, but I\'ll meet you at ${c} ${price} for ${product}. Deal?`;
    case 'hold_at_floor': return `${c} ${price} is the best I can do on ${product} \u2014 that\'s my final price. Want it?`;
    default: return `Sorry, ${product} is priced at ${c} ${price} and I can\'t reduce it further.`;
  }
}

async function phrase(decision, price, product, customerOffer) {
  if (!processPrompt) return templateReply(decision, price, product);
  const intent = {
    accept: 'Accept the customer\'s offer warmly and ask to confirm the order.',
    counter: `Politely decline their offer (${CURRENCY()} ${customerOffer}) and counter at ${CURRENCY()} ${price}. Friendly, confident, not pushy.`,
    hold_at_floor: `This is the final price (${CURRENCY()} ${price}); say it kindly as best-and-final and invite them to buy.`,
    reject: `Explain the price (${CURRENCY()} ${price}) can\'t be reduced, stay friendly.`
  }[decision];
  const prompt = [
    'Write ONE short, friendly WhatsApp reply for a price negotiation. 1-2 lines.',
    `Product: ${product}. ${intent}`,
    'Match the customer\'s language (English/Urdu/Roman Urdu). Do NOT mention any number other than the price stated. Return ONLY the message.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return templateReply(decision, price, product);
    return String(raw).trim().replace(/^"|"$/g, '');
  } catch { return templateReply(decision, price, product); }
}

// ── Public flow ─────────────────────────────────────────────
/**
 * Handle a customer\'s price offer for a product.
 * @param {object} args { storeId?, phone, product, customerOffer (number), listPrice? (override) }
 * @returns {Promise<{ decision, price, floor, listPrice, round, roundsLeft, reply, source }>}
 */
async function handleOffer({ storeId = 'default_store', phone, product, customerOffer, listPrice } = {}) {
  if (!phone || !product) throw new Error('phone and product are required');
  const policy = getPolicy(storeId);
  const lim = limitsFor(policy, product, listPrice);
  if (lim.listPrice == null || lim.floor == null) {
    return { decision: 'reject', price: lim.listPrice || null, floor: lim.floor || null, listPrice: lim.listPrice || null, round: 0, roundsLeft: 0, reply: `Please ask me for the price of ${product} first.`, source: 'config' };
  }

  const state = readState(storeId);
  const key = stateKey(phone, product);
  const st = state[key] || { phone, product: norm(product), round: 0, status: 'open', listPrice: lim.listPrice, floor: lim.floor };
  // closed deals don\'t reopen automatically
  if (st.status === 'accepted') {
    return { decision: 'accept', price: st.agreedPrice, floor: lim.floor, listPrice: lim.listPrice, round: st.round, roundsLeft: 0, reply: `We already agreed on ${CURRENCY()} ${st.agreedPrice} for ${product}. Confirm the order?`, source: 'state' };
  }

  const round = st.round + 1;
  const d = decide({ listPrice: lim.listPrice, floor: lim.floor, customerOffer: Number(customerOffer), round, maxRounds: lim.maxRounds, acceptWithinPct: lim.acceptWithinPct });

  // SAFETY assertion: never return a price below floor
  if (d.price != null && d.price < d.floor) d.price = d.floor;

  st.round = round;
  st.lastOffer = Number(customerOffer);
  st.lastCounter = d.price;
  if (d.decision === 'accept') { st.status = 'accepted'; st.agreedPrice = d.price; }
  else if (d.decision === 'hold_at_floor') st.status = 'final';
  else st.status = 'negotiating';
  state[key] = st; writeState(storeId, state);

  const reply = await phrase(d.decision, d.price, product, Number(customerOffer));
  const source = processPrompt ? 'ollama' : 'fallback';
  return { decision: d.decision, price: d.price, floor: d.floor, listPrice: d.listPrice, round, roundsLeft: d.roundsLeft, reply, source };
}

function getState({ storeId = 'default_store', phone, product } = {}) {
  if (!phone || !product) throw new Error('phone and product are required');
  return readState(storeId)[stateKey(phone, product)] || null;
}
function resetState({ storeId = 'default_store', phone, product } = {}) {
  const state = readState(storeId); delete state[stateKey(phone, product)]; writeState(storeId, state); return { reset: true };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), currency: CURRENCY() };
}

module.exports = { getPolicy, setPolicy, limitsFor, handleOffer, getState, resetState, health, _internal: { decide, templateReply, norm } };
