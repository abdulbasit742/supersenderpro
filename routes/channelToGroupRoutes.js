// routes/channelToGroupRoutes.js
// Channel to Group Auto-Share routes
// POST /api/channel-to-group/rules         - create rule
// GET  /api/channel-to-group/rules         - list rules
// GET  /api/channel-to-group/rules/:id     - get rule
// PUT  /api/channel-to-group/rules/:id     - update rule
// DELETE /api/channel-to-group/rules/:id   - delete rule
// POST /api/channel-to-group/rules/:id/toggle - enable/disable
// POST /api/channel-to-group/test          - test with a sample post
// POST /api/channel-to-group/process       - manually trigger processing
// GET  /api/channel-to-group/logs          - get logs
// GET  /api/channel-to-group/queue         - get pending queue
// GET  /api/channel-to-group/stats         - stats overview

"use strict";
const express = require("express");
const router  = express.Router();
let eng;
try { eng = require("../lib/channelToGroup/engine"); } catch(e) { eng = null; console.warn("[ChannelToGroup] engine not loaded:", e.message); }

const ok   = (res, d) => res.json({ ok: true, ...d });
const fail = (res, e, code) => res.status(code || 500).json({ ok: false, error: String(e && e.message ? e.message : e) });

function guard(req, res, next) {
  const secret = process.env.CHANNEL_ADMIN_SECRET || process.env.ADMIN_TOKEN || "";
  if (!secret) return next();
  const provided = req.get("x-admin-secret") || req.query.secret || (req.body && req.body.secret);
  if (provided === secret) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

if (!eng) {
  router.all("*", (req, res) => res.status(503).json({ ok: false, error: "channelToGroup engine not loaded" }));
  module.exports = router;
} else {

// List rules
router.get("/rules", (req, res) => {
  try { ok(res, { rules: eng.getRules() }); } catch(e) { fail(res, e); }
});

// Get one rule
router.get("/rules/:id", (req, res) => {
  try {
    const rule = eng.getRule(req.params.id);
    if (!rule) return res.status(404).json({ ok: false, error: "Rule not found" });
    ok(res, { rule });
  } catch(e) { fail(res, e); }
});

// Create rule
router.post("/rules", guard, (req, res) => {
  try { ok(res, { rule: eng.createRule(req.body || {}) }); } catch(e) { fail(res, e); }
});

// Update rule
router.put("/rules/:id", guard, (req, res) => {
  try {
    const rule = eng.updateRule(req.params.id, req.body || {});
    if (!rule) return res.status(404).json({ ok: false, error: "Rule not found" });
    ok(res, { rule });
  } catch(e) { fail(res, e); }
});

// Delete rule
router.delete("/rules/:id", guard, (req, res) => {
  try { eng.deleteRule(req.params.id); ok(res, { deleted: true }); } catch(e) { fail(res, e); }
});

// Toggle enable/disable
router.post("/rules/:id/toggle", guard, (req, res) => {
  try {
    const rule = eng.getRule(req.params.id);
    if (!rule) return res.status(404).json({ ok: false, error: "Rule not found" });
    const updated = eng.toggleRule(req.params.id, !rule.enabled);
    ok(res, { rule: updated });
  } catch(e) { fail(res, e); }
});

// Set dry-run on/off for a rule
router.post("/rules/:id/dryrun", guard, (req, res) => {
  try {
    const rule = eng.updateRule(req.params.id, { dryRun: req.body.dryRun !== false });
    if (!rule) return res.status(404).json({ ok: false, error: "Rule not found" });
    ok(res, { rule });
  } catch(e) { fail(res, e); }
});

// Test: simulate a post against all rules (always dry-run)
router.post("/test", guard, async (req, res) => {
  try {
    const body = req.body || {};
    // force dry-run for test
    const result = await eng.processPost({
      channelId: body.channelId || body.sourceChannelId || "test_channel",
      text: body.text || "Test post content",
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      messageId: "test_" + Date.now(),
    }, null); // null waClient = always dry-run
    ok(res, { testResult: result, logs: eng.getLogs(10) });
  } catch(e) { fail(res, e); }
});

// Manual post ingestion (from webhook or admin trigger)
router.post("/process", guard, async (req, res) => {
  try {
    const body = req.body || {};
    // Get waClient from global (injected by server.js)
    const waClient = global.__waClientForChannelToGroup || null;
    const result = await eng.processPost({
      channelId: body.channelId || "",
      text: body.text || "",
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      messageId: body.messageId || null,
    }, waClient);
    ok(res, { result });
  } catch(e) { fail(res, e); }
});

// Process queue
router.post("/queue/process", guard, async (req, res) => {
  try {
    const waClient = global.__waClientForChannelToGroup || null;
    const result = await eng.processQueue(waClient);
    ok(res, { result });
  } catch(e) { fail(res, e); }
});

// Get logs
router.get("/logs", (req, res) => {
  try { ok(res, { logs: eng.getLogs(Number(req.query.limit) || 100) }); } catch(e) { fail(res, e); }
});

// Get queue
router.get("/queue", (req, res) => {
  try { ok(res, { queue: eng.getQueue() }); } catch(e) { fail(res, e); }
});

// Stats
router.get("/stats", (req, res) => {
  try { ok(res, { stats: eng.getStats() }); } catch(e) { fail(res, e); }
});

} // end else
module.exports = router;
