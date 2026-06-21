  'use strict';
  /**
   * routes/aiAgentMonitorRoutes.js — AI Agent Monitoring + Human Handoff + Reply
   * Quality QA API. Preview-only / dry-run. No external AI call, no external API
   * call, no live sends, no secrets, no full PII. Requires express.json() for POST.
   */
  const express = require('express');
  const router = express.Router();

  const store = require('../lib/aiAgentMonitor/store');
  const model = require('../lib/aiAgentMonitor/aiReplyModel');
  const replyQuality = require('../lib/aiAgentMonitor/replyQuality');
  const riskChecker = require('../lib/aiAgentMonitor/riskChecker');
  const handoffRules = require('../lib/aiAgentMonitor/handoffRules');
  const handoffQueue = require('../lib/aiAgentMonitor/handoffQueue');
  const knowledgeGapDetector = require('../lib/aiAgentMonitor/knowledgeGapDetector');
  const agentAnalytics = require('../lib/aiAgentMonitor/agentAnalytics');


  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  function ensureSeeded() { if (store.all().length === 0) model.seeds().forEach((r) => store.put(r));
  handoffQueue.seedFromStore(); }

  router.get('/status', wrap(function (req, res) {
    ensureSeeded();
    res.json({
      ok: true, module: 'ai-agent-monitor',
      dryRun: true, liveActionsEnabled: false,
      liveAiCall: false, liveSend: false, externalCalls: false,
      repliesMonitored: store.all().length,
      handoffQueue: handoffQueue.list().length,
      warnings: [], blockers: [],
      timestamp: new Date().toISOString(),
    });
  }));

  router.get('/replies', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, replies: store.all()
  }); }));

  router.get('/replies/:id', wrap(function (req, res) {
    ensureSeeded();
    const r = store.get(req.params.id);
    return r ? res.json({ ok: true, dryRun: true, reply: r }) : res.status(404).json({ ok: false, error: 'not_found' });
  }));

router.post('/replies/:id/check-quality', wrap(function (req, res) {
 ensureSeeded();
 const r = store.get(req.params.id);
 if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
 const q = replyQuality.assess(r.userMessagePreview, r.aiReplyPreview, r.confidenceScore);
 const risk = riskChecker.check(r.userMessagePreview, r.aiReplyPreview, q.confidenceScore);
 const handoff = handoffRules.evaluate({ userMessage: r.userMessagePreview, aiReply: r.aiReplyPreview, confidenceScore:
q.confidenceScore });
 store.put(Object.assign({}, r, { confidenceScore: q.confidenceScore, qualityScore: q.qualityScore, riskLevel:
risk.riskLevel, handoffRequired: handoff.handoffRequired, status: handoff.handoffRequired ? 'needs_review' : r.status
}));
 res.json({ ok: true, dryRun: true, liveActionsEnabled: false, confidenceScore: q.confidenceScore, qualityScore:
q.qualityScore, riskLevel: risk.riskLevel, handoffRequired: handoff.handoffRequired, warnings:
q.warnings.concat(risk.warnings), blockers: [] });
}));

router.post('/replies/:id/flag', wrap(function (req, res) {
 ensureSeeded();
 const r = store.get(req.params.id);
 if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
 const reason = (req.body && req.body.reason) || 'manual_flag';
 const updated = store.put(Object.assign({}, r, { status: 'needs_review', handoffRequired: true }));
 res.json({ ok: true, dryRun: true, replyId: updated.id, status: updated.status, reason, warnings: [], blockers: [] });
}));


router.post('/replies/:id/handoff-preview', wrap(function (req, res) {
 ensureSeeded();
 const r = store.get(req.params.id);
 if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
 const handoff = handoffRules.evaluate({ userMessage: r.userMessagePreview, aiReply: r.aiReplyPreview, confidenceScore:
r.confidenceScore });
 const item = handoffQueue.enqueuePreview(r, handoff.primaryReason || 'manual');
 store.put(Object.assign({}, r, { status: 'escalated', handoffRequired: true }));
 res.json({ ok: true, dryRun: true, liveHandoff: false, conversationId: r.conversationId, reason: item.reason,
assignedQueue: item.assignedQueue, warnings: [], blockers: [] });
}));


router.get('/handoff-queue', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, queue:
handoffQueue.list() }); }));


router.post('/handoff-rules/check', wrap(function (req, res) {
 const b = req.body || {};
 res.json(Object.assign({ ok: true, dryRun: true }, handoffRules.evaluate(b)));
}));

router.post('/knowledge-gap/check', wrap(function (req, res) {
 const b = req.body || {};
 res.json(Object.assign({ ok: true, dryRun: true }, knowledgeGapDetector.check(b.userMessage)));
}));


router.get('/analytics', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, analytics:
agentAnalytics.overview(store.all()) }); }));


router.post('/override-draft', wrap(function (req, res) {
 // Human override: produce a corrected DRAFT reply. Never sends.
 const b = req.body || {};

 const draft = String(b.overrideText || '').slice(0, 800) || '[human override draft]';
 res.json({ ok: true, dryRun: true, liveSend: false, channel: b.channel || 'whatsapp', overrideDraftPreview: draft,
note: 'Draft only; not sent.', warnings: [], blockers: [] });
}));


module.exports = router;
