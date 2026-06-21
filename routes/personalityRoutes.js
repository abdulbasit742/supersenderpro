'use strict';

const express = require('express');
const router = express.Router();

const analyzer = require('../lib/personalityDisc/discAnalyzer');
const store = require('../lib/personalityDisc/store');

function safeError(res, error) {
  console.error('[PersonalityDISC] route error:', error.message);
  return res.status(500).json({
    ok: false,
    error: 'internal_error',
    dryRun: true,
    liveActionsEnabled: false,
  });
}

function sanitizeMessages(input) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 200);
}

router.get('/status', (req, res) => {
  try {
    res.json({
      ok: true,
      module: 'personality-disc',
      dryRun: true,
      liveActionsEnabled: false,
      externalCallsEnabled: false,
      storePath: store.STORE_PATH,
      stats: store.getStats(),
      profiles: analyzer.getDISCProfiles(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    safeError(res, error);
  }
});

router.get('/profiles', (req, res) => {
  try {
    res.json({
      ok: true,
      dryRun: true,
      liveActionsEnabled: false,
      profiles: analyzer.getDISCProfiles(),
      savedProfiles: store.listProfiles({ limit: req.query.limit, type: req.query.type }),
      stats: store.getStats(),
    });
  } catch (error) {
    safeError(res, error);
  }
});

router.get('/clients', (req, res) => {
  try {
    res.json({
      ok: true,
      dryRun: true,
      liveActionsEnabled: false,
      clients: store.listProfiles({ limit: req.query.limit, type: req.query.type }),
    });
  } catch (error) {
    safeError(res, error);
  }
});

router.get('/profile/:clientId', (req, res) => {
  try {
    const profile = store.getProfile(req.params.clientId);
    if (!profile) return res.status(404).json({ ok: false, error: 'not_found', dryRun: true });
    return res.json({ ok: true, dryRun: true, liveActionsEnabled: false, profile });
  } catch (error) {
    return safeError(res, error);
  }
});

router.post('/analyze', (req, res) => {
  try {
    const messages = sanitizeMessages(req.body && req.body.messages);
    const clientId = req.body && req.body.clientId ? String(req.body.clientId).trim() : '';
    if (!messages.length) {
      return res.status(400).json({
        ok: false,
        error: 'messages_required',
        message: 'messages must be a non-empty array of strings',
        dryRun: true,
      });
    }

    const result = analyzer.analyzeClientPersonality({ messages, clientId, source: 'api-analyze' });
    if (clientId) {
      store.upsertProfile(clientId, result);
      store.appendMessageLog({ clientId, source: 'analyze', messages, resultPreview: result.primaryType });
    }

    return res.json({
      ok: true,
      dryRun: true,
      liveActionsEnabled: false,
      result,
      guidance: analyzer.buildReplyGuidance(result),
      warnings: result.confidence === 'low' ? ['Low confidence: add more customer messages for a stronger profile.'] : [],
      blockers: [],
    });
  } catch (error) {
    return safeError(res, error);
  }
});

router.post('/analyze-chat', (req, res) => {
  try {
    const chat = req.body && typeof req.body.chat === 'string' ? req.body.chat : '';
    const senderName = req.body && req.body.senderName ? String(req.body.senderName).trim() : '';
    const clientId = req.body && req.body.clientId ? String(req.body.clientId).trim() : '';
    if (!chat.trim()) {
      return res.status(400).json({ ok: false, error: 'chat_required', dryRun: true });
    }

    const messages = analyzer.parseWhatsAppChat(chat, senderName);
    if (!messages.length) {
      return res.status(422).json({
        ok: false,
        error: 'no_messages_extracted',
        dryRun: true,
        warnings: ['Paste a WhatsApp export or remove senderName filter and try again.'],
        blockers: [],
      });
    }

    const result = analyzer.analyzeClientPersonality({ messages, clientId, source: 'api-analyze-chat' });
    if (clientId) {
      store.upsertProfile(clientId, result);
      store.appendMessageLog({ clientId, source: 'analyze-chat', senderName, messages, resultPreview: result.primaryType });
    }

    return res.json({
      ok: true,
      dryRun: true,
      liveActionsEnabled: false,
      extractedMessages: messages.length,
      result,
      guidance: analyzer.buildReplyGuidance(result),
      warnings: [],
      blockers: [],
    });
  } catch (error) {
    return safeError(res, error);
  }
});

router.post('/sales-draft', (req, res) => {
  try {
    const clientId = req.body && req.body.clientId ? String(req.body.clientId).trim() : '';
    const existingProfile = clientId ? store.getProfile(clientId) : null;
    const draft = analyzer.buildTailoredReplyDraft({
      profile: existingProfile || req.body.profile,
      customerMessage: req.body.customerMessage || req.body.message || '',
      offer: req.body.offer || 'selected SuperSender offer',
    });
    if (clientId) store.appendDraftLog({ clientId, draftPreview: draft.messagePreview, detectedType: draft.detectedType });
    return res.json(draft);
  } catch (error) {
    return safeError(res, error);
  }
});

router.get('/analytics', (req, res) => {
  try {
    const stats = store.getStats();
    const savedProfiles = store.listProfiles({ limit: 200 });
    const confidence = savedProfiles.reduce((acc, profile) => {
      acc[profile.confidence] = (acc[profile.confidence] || 0) + 1;
      return acc;
    }, {});
    return res.json({
      ok: true,
      dryRun: true,
      liveActionsEnabled: false,
      stats,
      confidence,
      recommendedNextActions: [
        'Use D profiles for short price-first replies.',
        'Use I profiles for social proof and energetic offers.',
        'Use S profiles for reassurance, warranty, and support clarity.',
        'Use C profiles for exact policy, proof, and comparison tables.',
      ],
    });
  } catch (error) {
    return safeError(res, error);
  }
});

module.exports = router;
