// routes/supportInboxRoutes.js — REST surface for the Customer Support Inbox.
// Mount at /api/support-inbox.

const express = require('express');
const router = express.Router();

let si = null; try { si = require('../lib/supportInbox'); } catch (e) { si = null; }

function guard(req, res) { if (!si) { res.status(503).json({ ok: false, error: 'support inbox not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!si) return res.json({ ok: false, error: 'support inbox not loaded' });
 const r = si.doctor.run();
 res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(si.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...si.ticketEngine.overview() }); });

router.get('/tickets', (req, res) => {
 if (!guard(req, res)) return;
 res.json({ ok: true, items: si.ticketEngine.list({ status: req.query.status, assignee: req.query.assignee, priority: req.query.priority, limit: Number(req.query.limit) || 100 }) });
});
router.get('/tickets/:id', (req, res) => {
 if (!guard(req, res)) return;
 const t = si.ticketEngine.get(req.params.id);
 if (!t) return res.status(404).json({ ok: false, error: 'ticket not found' });
 res.json({ ok: true, ticket: t });
});

// Open a ticket from an inbound message (call this from the WhatsApp inbound handler).
router.post('/inbound', (req, res) => {
 if (!guard(req, res)) return;
 try { res.json({ ok: true, ...si.ticketEngine.openFromMessage(req.body || {}) }); }
 catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/tickets/:id/assign', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ticket: si.ticketEngine.assign(req.params.id, (req.body || {}).agent) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tickets/:id/priority', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ticket: si.ticketEngine.setPriority(req.params.id, (req.body || {}).priority) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tickets/:id/tag', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ticket: si.ticketEngine.addTag(req.params.id, (req.body || {}).tag) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tickets/:id/reply', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await si.ticketEngine.respond(req.params.id, req.body || {})) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tickets/:id/resolve', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ticket: si.ticketEngine.resolve(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tickets/:id/reopen', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ticket: si.ticketEngine.reopen(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tickets/:id/close', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ticket: si.ticketEngine.close(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/canned', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: si.cannedReplies.list() }); });
router.post('/canned', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, reply: si.cannedReplies.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/sla/breaches', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, breaches: si.slaPolicy.breaches(si.ticketStore.all()) }); });

// Expose the notifier setter for server-side wiring (WhatsApp send fn).
router.setNotifier = (fn) => (si ? si.notify.setNotifier(fn) : false);

module.exports = router;
