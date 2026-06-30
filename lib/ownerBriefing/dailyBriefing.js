// lib/ownerBriefing/dailyBriefing.js
// ────────────────────────────────────────────────────────────────────
// AI Daily Owner Briefing. A time-strapped founder shouldn't have to open ten
// dashboards. This rolls up the whole AI suite's activity into ONE short morning
// digest: hot leads, at-risk customers, escalations, orders, voice notes, media,
// new FAQ candidates — then the AI Brain Bridge (self-hosted Ollama) writes a
// crisp founder-facing summary + the top 3 things to do today.
//
// All numbers are computed deterministically from the other features' file
// stores (read-only). The model only phrases them; if it's offline you still get
// a clean templated digest. Built to run at 9am on PC #1. Zero new deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[dailyBriefing] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.BRIEFING_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const DATA_ROOT = path.join(__dirname, '..', '..', 'data');
const OUT_DIR = path.join(DATA_ROOT, 'owner_briefing');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const histFile = (storeId) => path.join(OUT_DIR, `${storeId}_history.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }

function within(ts, sinceMs) { return ts && ts >= sinceMs; }

// ── Gather KPIs from the suite's stores (all read-only, all optional) ───────
function gather(storeId, { sinceMs }) {
  const k = {};

  // Lead intelligence
  const leads = Object.values(readJSON(path.join(DATA_ROOT, 'lead_intel', `${storeId}_scores.json`), {}));
  k.leadsTotal = leads.length;
  k.hotLeads = leads.filter(l => l.band === 'hot').length;
  k.warmLeads = leads.filter(l => l.band === 'warm').length;
  k.atRisk = leads.filter(l => l.atRisk).length;
  k.topActions = leads.filter(l => l.nextBestAction && (l.band === 'hot' || l.band === 'warm'))
    .sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
    .map(l => ({ phone: l.phone, score: l.score, action: l.nextBestAction }));

  // Orders (drafts + confirmed)
  const drafts = Object.values(readJSON(path.join(DATA_ROOT, 'orders_draft', `${storeId}_drafts.json`), {}));
  k.ordersDraft = drafts.filter(d => d.status === 'draft' && within(d.ts, sinceMs)).length;
  k.ordersConfirmed = drafts.filter(d => d.status === 'confirmed' && within(d.confirmedAt || d.ts, sinceMs)).length;

  // Voice notes
  const voice = readJSON(path.join(DATA_ROOT, 'voice_notes', '_jobs.json'), []);
  k.voiceNotes = voice.filter(v => v.storeId === storeId && within(v.ts, sinceMs)).length;

  // Media generations
  const media = readJSON(path.join(DATA_ROOT, 'generated_media', '_jobs.json'), []);
  k.mediaGenerated = media.filter(m => m.storeId === storeId && within(m.ts, sinceMs)).length;

  // FAQ candidates pending review
  const faqs = readJSON(path.join(DATA_ROOT, 'faq_trainer', `${storeId}_candidates.json`), []);
  k.faqPending = faqs.filter(c => c.status === 'pending').length;

  // Support escalations (from conversation store)
  const convos = readJSON(path.join(DATA_ROOT, 'support_agent', `${storeId}_conversations.json`), {});
  const threads = Object.values(convos);
  k.activeChats = threads.filter(t => (t.history || []).some(h => within(h.ts, sinceMs))).length;
  k.escalations = threads.filter(t => within(t.escalatedAt, sinceMs)).length;

  return k;
}

function templateDigest(k, dateLabel) {
  const lines = [];
  lines.push(`\u2600\ufe0f *Daily Briefing — ${dateLabel}*`);
  lines.push('');
  lines.push(`\ud83d\udd25 Hot leads: ${k.hotLeads}  |  \ud83d\udfe1 Warm: ${k.warmLeads}  |  \u26a0\ufe0f At-risk: ${k.atRisk}`);
  lines.push(`\ud83d\udcac Active chats: ${k.activeChats}  |  \ud83c\udd98 Escalations: ${k.escalations}`);
  lines.push(`\ud83d\uded2 Orders: ${k.ordersConfirmed} confirmed, ${k.ordersDraft} draft`);
  lines.push(`\ud83c\udfa4 Voice notes: ${k.voiceNotes}  |  \ud83c\udfa8 Media made: ${k.mediaGenerated}`);
  if (k.faqPending) lines.push(`\ud83d\udcda ${k.faqPending} new FAQ${k.faqPending > 1 ? 's' : ''} awaiting your approval`);
  if (k.topActions && k.topActions.length) {
    lines.push('');
    lines.push('*Top next actions:*');
    k.topActions.forEach((a, i) => lines.push(`${i + 1}. (${a.score}) ${a.phone}: ${a.action}`));
  }
  return lines.join('\n');
}

async function aiNarrative(k, dateLabel) {
  if (!processPrompt) return null;
  const prompt = [
    'You are the chief of staff for a WhatsApp commerce founder. Write a SHORT morning briefing (5-7 lines max).',
    `Date: ${dateLabel}. Use ONLY these numbers; do not invent any:`,
    JSON.stringify(k),
    '',
    'Then end with a line "TOP 3 TODAY:" followed by 3 concrete, prioritized actions based on the data',
    '(hot leads to chase, at-risk to save, escalations to clear, FAQs to approve). Be direct and practical.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    return String(raw).trim();
  } catch (err) { console.warn('[dailyBriefing] narrative failed:', err.message); return null; }
}

/**
 * Generate today's briefing.
 * @returns {Promise<{ date, kpis, digest, narrative, source }>}
 */
async function generate({ storeId = 'default_store', sinceHours = 24, save = true } = {}) {
  const sinceMs = Date.now() - sinceHours * 3600 * 1000;
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const kpis = gather(storeId, { sinceMs });
  const digest = templateDigest(kpis, dateLabel);
  const narrative = await aiNarrative(kpis, dateLabel);
  const record = {
    date: new Date().toISOString().slice(0, 10),
    storeId, kpis, digest,
    narrative: narrative || null,
    text: narrative || digest, // what to actually send
    source: narrative ? 'ollama' : 'fallback',
    ts: Date.now()
  };
  if (save) {
    const hist = readJSON(histFile(storeId), []);
    hist.push(record);
    try { fs.writeFileSync(histFile(storeId), JSON.stringify(hist.slice(-90), null, 2)); } catch (e) { console.error('[dailyBriefing] save failed:', e.message); }
  }
  return record;
}

function latest({ storeId = 'default_store' } = {}) {
  const hist = readJSON(histFile(storeId), []);
  return hist.length ? hist[hist.length - 1] : null;
}
function history({ storeId = 'default_store', limit = 30 } = {}) {
  return readJSON(histFile(storeId), []).slice(-limit).reverse();
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() };
}

module.exports = { generate, latest, history, health, _internal: { gather, templateDigest } };
