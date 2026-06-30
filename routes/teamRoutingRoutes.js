// routes/teamRoutingRoutes.js — REST surface for Team Inbox Routing & Assignment. Mount at /api/team-routing.

const express = require('express');
const router = express.Router();

let tr = null; try { tr = require('../lib/teamRouting'); } catch (e) { tr = null; }
function guard(req, res) { if (!tr) { res.status(503).json({ ok: false, error: 'team routing not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!tr) return res.json({ ok: false, error: 'team routing not loaded' });
 const r = tr.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(tr.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...tr.router.overview() }); });

// Agents
router.post('/agents', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, agent: tr.agentStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/agents', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: tr.agentStore.all() }); });
router.get('/agents/:id', (req, res) => { if (!guard(req, res)) return; const a = tr.agentStore.get(req.params.id); if (!a) return res.status(404).json({ ok: false, error: 'agent not found' }); res.json({ ok: true, agent: a }); });
router.post('/agents/:id/online', (req, res) => { if (!guard(req, res)) return; const online = (req.body || {}).online !== false; const a = tr.agentStore.setOnline(req.params.id, online); if (!online) tr.router.reassignAgentConversations(req.params.id); res.json({ ok: true, agent: a }); });

// Assignment
router.post('/assign', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.conversationId) return res.status(400).json({ ok: false, error: 'conversationId is required' }); res.json({ ok: true, ...tr.router.assign(b.conversationId, { skill: b.skill, strategy: b.strategy }) }); });
router.post('/release', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.conversationId) return res.status(400).json({ ok: false, error: 'conversationId is required' }); res.json({ ok: true, ...tr.router.release(b.conversationId) }); });
router.post('/reassign', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.conversationId) return res.status(400).json({ ok: false, error: 'conversationId is required' }); res.json({ ok: true, ...tr.router.reassign(b.conversationId, { skill: b.skill, strategy: b.strategy }) }); });
router.get('/assignment/:conversationId', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, assignment: tr.router.assignmentFor(req.params.conversationId) }); });
router.get('/queue', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: tr.router.queue() }); });

module.exports = router;
