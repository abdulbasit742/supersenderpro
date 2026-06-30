// lib/faqTrainer/faqTrainer.js
// ────────────────────────────────────────────────────────────────────
// Self-improving FAQ trainer. The support agent (#1) escalates or fumbles
// questions it can't answer; those are gold. This mines recent customer
// questions — especially escalated / low-confidence ones — clusters the
// recurring ones, and uses the AI Brain Bridge (self-hosted Ollama) to draft
// candidate FAQ Q/A pairs. Candidates are deduped against the existing RAG
// knowledge base and queued for HUMAN APPROVAL before they ever go live.
//
// The loop: chats -> mined questions -> AI-drafted FAQ -> human approves ->
// ingested into RAG (#3) -> the agent now answers it automatically next time.
//
// Deterministic clustering means it still produces candidates with no model
// (just without polished phrasing). Built to run overnight on PC #2. Zero deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[faqTrainer] aiBrain unavailable:', e.message); processPrompt = null; }

let rag = null;
try { rag = require('../../ai/knowledgeBase/ragStore'); } catch { /* optional */ }

const MODEL = () => process.env.FAQ_TRAINER_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const SUPPORT_DATA = path.join(__dirname, '..', '..', 'data', 'support_agent');
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'faq_trainer');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const candFile = (storeId) => path.join(DATA_DIR, `${storeId}_candidates.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[faqTrainer] write failed:', e.message); } }

// ── Harvest customer questions from support-agent conversations ────────────
function harvestQuestions(storeId, { onlyEscalated = false, sinceDays = 30 } = {}) {
  const convoPath = path.join(SUPPORT_DATA, `${storeId}_conversations.json`);
  const convos = readJSON(convoPath, {});
  const cutoff = Date.now() - sinceDays * 86400000;
  const questions = [];
  for (const phone of Object.keys(convos)) {
    const thread = convos[phone] || {};
    if (onlyEscalated && !thread.escalatedAt) continue;
    for (const turn of (thread.history || [])) {
      if (turn.role !== 'user') continue;
      if (turn.ts && turn.ts < cutoff) continue;
      const text = (turn.content || '').trim();
      // keep things that look like questions / requests
      if (text.length >= 6 && (/\?|how|what|when|where|kya|kaise|kab|kitne|kitna|price|deliver/i.test(text))) {
        questions.push(text);
      }
    }
  }
  return questions;
}

// ── Lightweight clustering (token-overlap) ────────────────────────────
function normalize(s) { return String(s).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ').split(/\s+/).filter(w => w.length > 2); }
function similarity(a, b) {
  const A = new Set(normalize(a)), B = new Set(normalize(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / Math.sqrt(A.size * B.size);
}

function cluster(questions, { threshold = 0.5, minSize = 2 } = {}) {
  const clusters = [];
  for (const q of questions) {
    let placed = false;
    for (const c of clusters) {
      if (similarity(q, c.representative) >= threshold) { c.members.push(q); placed = true; break; }
    }
    if (!placed) clusters.push({ representative: q, members: [q] });
  }
  return clusters
    .map(c => ({ representative: c.representative, members: c.members, size: c.members.length }))
    .filter(c => c.size >= minSize)
    .sort((a, b) => b.size - a.size);
}

// ── Draft an FAQ from a cluster ────────────────────────────────────
async function draftFaq(cluster) {
  if (!processPrompt) {
    return { q: cluster.representative.replace(/\s+/g, ' ').trim(), a: '', drafted: false };
  }
  const sample = cluster.members.slice(0, 8).map((m, i) => `${i + 1}. ${m}`).join('\n');
  const prompt = [
    'These are real customer questions that clustered together. Write ONE canonical FAQ entry that covers them.',
    'Output exactly:',
    'Q: <the canonical question, clear and general>',
    'A: <a concise, helpful answer. If you do not know specifics like price, leave a placeholder like [ADD PRICE].>',
    '',
    'Customer questions:',
    sample
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) {
      return { q: cluster.representative, a: '', drafted: false };
    }
    const q = (raw.match(/Q:\s*(.+)/i) || [])[1];
    const a = (raw.match(/A:\s*([\s\S]+)/i) || [])[1];
    return { q: (q || cluster.representative).trim(), a: (a || '').trim(), drafted: true };
  } catch (err) {
    console.warn('[faqTrainer] draft failed:', err.message);
    return { q: cluster.representative, a: '', drafted: false };
  }
}

// ── Dedupe against existing knowledge ───────────────────────────────
async function isDuplicate(storeId, question) {
  if (!rag || typeof rag.search !== 'function') return false;
  try {
    const hits = await rag.search(storeId, question, { k: 1 });
    return hits && hits[0] && hits[0].score >= 0.75; // already well-covered
  } catch { return false; }
}

/**
 * Mine chats -> clusters -> candidate FAQ entries (queued, status 'pending').
 * @returns {Promise<{ mined, clusters, candidates }>}
 */
async function mine({ storeId = 'default_store', onlyEscalated = false, sinceDays = 30, minClusterSize = 2 } = {}) {
  const questions = harvestQuestions(storeId, { onlyEscalated, sinceDays });
  const clusters = cluster(questions, { minSize: minClusterSize });
  const existing = readJSON(candFile(storeId), []);
  const existingQs = new Set(existing.map(c => normalize(c.q).join(' ')));

  const newCandidates = [];
  for (const c of clusters) {
    const dup = await isDuplicate(storeId, c.representative);
    if (dup) continue;
    const faq = await draftFaq(c);
    const key = normalize(faq.q).join(' ');
    if (existingQs.has(key)) continue;
    existingQs.add(key);
    newCandidates.push({
      id: crypto.randomUUID().slice(0, 12),
      q: faq.q, a: faq.a, drafted: faq.drafted,
      frequency: c.size, examples: c.members.slice(0, 5),
      status: 'pending', createdAt: Date.now()
    });
  }
  const all = existing.concat(newCandidates);
  writeJSON(candFile(storeId), all);
  return { mined: questions.length, clusters: clusters.length, candidates: newCandidates.length, newCandidates };
}

function listCandidates({ storeId = 'default_store', status = 'pending', limit = 100 } = {}) {
  let list = readJSON(candFile(storeId), []).sort((a, b) => b.frequency - a.frequency);
  if (status) list = list.filter(c => c.status === status);
  return list.slice(0, limit);
}

function updateCandidate(storeId, id, patch) {
  const all = readJSON(candFile(storeId), []);
  const idx = all.findIndex(c => c.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch };
  writeJSON(candFile(storeId), all);
  return all[idx];
}

/**
 * Approve a candidate: optionally edit q/a, then ingest into the RAG knowledge
 * base so the agent answers it automatically going forward.
 */
async function approve({ storeId = 'default_store', id, q, a } = {}) {
  const cand = readJSON(candFile(storeId), []).find(c => c.id === id);
  if (!cand) return { approved: false, error: 'candidate not found' };
  const finalQ = (q || cand.q || '').trim();
  const finalA = (a || cand.a || '').trim();
  if (!finalQ || !finalA) return { approved: false, error: 'q and a are required (provide an answer before approving)' };

  let ingested = false;
  if (rag && typeof rag.ingestFaqs === 'function') {
    try { await rag.ingestFaqs(storeId, [{ q: finalQ, a: finalA }]); ingested = true; } catch (e) { console.warn('[faqTrainer] ingest failed:', e.message); }
  }
  updateCandidate(storeId, id, { status: 'approved', q: finalQ, a: finalA, approvedAt: Date.now(), ingested });
  return { approved: true, ingested, q: finalQ, a: finalA };
}

function reject({ storeId = 'default_store', id } = {}) {
  const updated = updateCandidate(storeId, id, { status: 'rejected', rejectedAt: Date.now() });
  return { rejected: Boolean(updated) };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), ragWired: Boolean(rag && rag.ingestFaqs) };
}

module.exports = { mine, listCandidates, approve, reject, health, _internal: { harvestQuestions, cluster, similarity, normalize } };
