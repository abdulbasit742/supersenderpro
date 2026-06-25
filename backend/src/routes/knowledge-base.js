const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');

const FILE = path.join(__dirname, '../../../data/knowledge_base.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return getDefaultKB(); } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

function getDefaultKB() {
  return {
    business: { name: process.env.BOT_NAME||'AI Tools Store', description: 'Pakistan-based AI tools subscription reseller', timezone: 'Asia/Karachi', currency: 'PKR', language: 'Urdu/English' },
    policies: {
      returns: 'No refunds after credentials are delivered. Warranty available for account issues.',
      warranty: '24-hour replacement warranty on all accounts.',
      delivery: 'Instant delivery after payment verification (usually within 5-15 minutes).',
      payments: 'JazzCash, EasyPaisa, and Bank Transfer accepted.'
    },
    faqs: [
      { id: '1', q: 'How do I buy a plan?', a: 'Send price to see all plans, choose one, send payment screenshot.' },
      { id: '2', q: 'How long does delivery take?', a: 'Usually 5-15 minutes after payment verification.' },
      { id: '3', q: 'What if account stops working?', a: 'We offer 24-hour replacement warranty. Message us with your order ID.' },
      { id: '4', q: 'Can I get a trial?', a: 'No free trials, but we offer 24-hour warranty on all purchases.' }
    ],
    tools: [
      { name: 'ChatGPT Plus', description: 'OpenAI GPT-4o access, image generation, plugins', category: 'AI Assistant' },
      { name: 'Claude Pro', description: 'Anthropic Claude 3.5 Sonnet, 100K context, files', category: 'AI Assistant' },
      { name: 'Cursor Pro', description: 'AI code editor with GPT-4 and Claude integration', category: 'Coding' },
      { name: 'Gemini Advanced', description: 'Google Gemini Ultra 1.0, multimodal AI', category: 'AI Assistant' },
      { name: 'Perplexity Pro', description: 'AI search engine with real-time web access', category: 'Search' }
    ],
    updatedAt: new Date().toISOString()
  };
}

router.get('/', requireAuth, asyncHandler(async (req, res) => { res.json(load()); }));

router.patch('/business', requireAuth, asyncHandler(async (req, res) => {
  const kb = load(); kb.business = { ...kb.business, ...req.body }; kb.updatedAt = new Date().toISOString();
  save(kb); res.json(kb.business);
}));

router.patch('/policies', requireAuth, asyncHandler(async (req, res) => {
  const kb = load(); kb.policies = { ...kb.policies, ...req.body }; kb.updatedAt = new Date().toISOString();
  save(kb); res.json(kb.policies);
}));

router.get('/faqs', asyncHandler(async (req, res) => { res.json(load().faqs || []); }));

router.post('/faqs', requireAuth, asyncHandler(async (req, res) => {
  const { q, a } = req.body || {};
  if (!q || !a) return res.status(400).json({ error: 'q and a required' });
  const kb = load(); kb.faqs = kb.faqs || [];
  kb.faqs.push({ id: uuid(), q, a, createdAt: new Date().toISOString() });
  kb.updatedAt = new Date().toISOString(); save(kb); res.status(201).json(kb.faqs[kb.faqs.length-1]);
}));

router.delete('/faqs/:id', requireAuth, asyncHandler(async (req, res) => {
  const kb = load(); kb.faqs = (kb.faqs||[]).filter(function(f) { return f.id !== req.params.id; });
  kb.updatedAt = new Date().toISOString(); save(kb); res.json({ success: true });
}));

router.get('/search', asyncHandler(async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.status(400).json({ error: 'q required' });
  const kb = load(); const results = [];
  (kb.faqs||[]).forEach(function(f) { if (f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) results.push({ type: 'faq', ...f }); });
  (kb.tools||[]).forEach(function(t) { if (t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) results.push({ type: 'tool', ...t }); });
  Object.entries(kb.policies||{}).forEach(function(e) { if (e[1].toLowerCase().includes(q)) results.push({ type: 'policy', key: e[0], content: e[1] }); });
  res.json({ query: q, count: results.length, results });
}));

router.get('/ai-context', asyncHandler(async (req, res) => {
  const kb = load();
  const NL = String.fromCharCode(10);
  const parts = [
    'Business: ' + kb.business.name + ' - ' + kb.business.description,
    'Policies: ' + JSON.stringify(kb.policies),
    'Tools: ' + (kb.tools||[]).map(function(t) { return t.name + ' (' + t.category + ')'; }).join(', '),
    'FAQs: ' + (kb.faqs||[]).slice(0,5).map(function(f) { return 'Q:' + f.q + ' A:' + f.a; }).join(' | ')
  ];
  const context = parts.join(NL + NL);
  res.json({ context, charCount: context.length });
}));

module.exports = router;