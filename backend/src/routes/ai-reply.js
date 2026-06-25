const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const fs = require('fs'), path = require('path');
const CFG = path.join(__dirname, '../../../data/ai_reply_config.json');
const LOG = path.join(__dirname, '../../../data/ai_reply_log.json');
const DEFAULT_CFG = { enabled: false, provider: 'openai', model: 'gpt-4o-mini', systemPrompt: 'You are a helpful AI tools store assistant for Pakistan. Answer questions about ChatGPT, Claude, Cursor, Gemini, etc. Be concise, friendly, and respond in the same language as the customer (Urdu or English).', maxTokens: 300, temperature: 0.7, dryRun: true };
function loadCfg() { try { return JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch(e) { return { ...DEFAULT_CFG }; } }
function saveCfg(d) { fs.writeFileSync(CFG, JSON.stringify(d, null, 2)); }
function loadLog() { try { return JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch(e) { return []; } }
function saveLog(d) { fs.writeFileSync(LOG, JSON.stringify(d.slice(0, 500), null, 2)); }

router.get('/config', requireAuth, asyncHandler(async (req, res) => {
  const cfg = loadCfg();
  res.json({ ...cfg, apiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : null });
}));
router.post('/config', requireAuth, asyncHandler(async (req, res) => {
  const cfg = loadCfg();
  ['enabled','provider','model','systemPrompt','maxTokens','temperature','dryRun','apiKey'].forEach(k => { if (req.body[k] !== undefined) cfg[k] = req.body[k]; });
  cfg.updatedAt = new Date().toISOString(); saveCfg(cfg);
  res.json({ ...cfg, apiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : null });
}));
router.post('/test', requireAuth, asyncHandler(async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  const cfg = loadCfg();
  if (cfg.dryRun) return res.json({ reply: '[DRY RUN] AI reply disabled. Set dryRun:false and configure apiKey to enable live AI replies.', model: cfg.model, dryRun: true, tokensUsed: 0 });
  if (!cfg.apiKey) return res.status(400).json({ error: 'apiKey not configured in AI Reply settings' });
  try {
    const axios = require('axios');
    let reply = '', tokensUsed = 0;
    if (!cfg.provider || cfg.provider === 'openai') {
      const r = await axios.post('https://api.openai.com/v1/chat/completions', { model: cfg.model || 'gpt-4o-mini', messages: [{ role: 'system', content: cfg.systemPrompt }, { role: 'user', content: message }], max_tokens: cfg.maxTokens || 300, temperature: cfg.temperature || 0.7 }, { headers: { Authorization: 'Bearer ' + cfg.apiKey } });
      reply = r.data.choices[0].message.content; tokensUsed = r.data.usage.total_tokens;
    } else if (cfg.provider === 'gemini') {
      const r = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + cfg.apiKey, { contents: [{ parts: [{ text: cfg.systemPrompt + ' Customer says: ' + message }] }] });
      reply = r.data.candidates[0].content.parts[0].text;
    } else if (cfg.provider === 'anthropic') {
      const r = await axios.post('https://api.anthropic.com/v1/messages', { model: cfg.model || 'claude-3-haiku-20240307', max_tokens: cfg.maxTokens || 300, system: cfg.systemPrompt, messages: [{ role: 'user', content: message }] }, { headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' } });
      reply = r.data.content[0].text;
    }
    const log = loadLog(); log.unshift({ ts: new Date().toISOString(), message, reply, model: cfg.model, tokensUsed }); saveLog(log);
    res.json({ reply, model: cfg.model, provider: cfg.provider, tokensUsed, dryRun: false });
  } catch(err) {
    const msg = err.response && err.response.data && err.response.data.error && err.response.data.error.message || err.message;
    res.status(502).json({ error: 'AI provider error: ' + msg });
  }
}));
router.get('/log', requireAuth, asyncHandler(async (req, res) => { res.json(loadLog().slice(0, Number(req.query.limit || 50))); }));
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const log = loadLog(), cfg = loadCfg();
  const totalTokens = log.reduce((s, l) => s + (l.tokensUsed || 0), 0);
  res.json({ enabled: cfg.enabled, provider: cfg.provider, model: cfg.model, dryRun: cfg.dryRun, totalReplies: log.length, totalTokens, estimatedCostUSD: (totalTokens * 0.00000015).toFixed(6) });
}));
module.exports = router;
