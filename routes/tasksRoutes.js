// routes/tasksRoutes.js — REST surface for Tasks & Follow-ups. Mount at /api/tasks.

const express = require('express');
const router = express.Router();

let tk = null; try { tk = require('../lib/tasks'); } catch (e) { tk = null; }
function guard(req, res) { if (!tk) { res.status(503).json({ ok: false, error: 'tasks not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!tk) return res.json({ ok: false, error: 'tasks not loaded' });
 const r = tk.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(tk.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...tk.reminders.overview() }); });

router.post('/tasks', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, task: tk.taskStore.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/tasks', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: tk.taskStore.list({ status: req.query.status, assignee: req.query.assignee, priority: req.query.priority, contact: req.query.contact, ticketId: req.query.ticketId, limit: Number(req.query.limit) || 200 }) }); });
router.get('/tasks/:id', (req, res) => { if (!guard(req, res)) return; const t = tk.taskStore.get(req.params.id); if (!t) return res.status(404).json({ ok: false, error: 'task not found' }); res.json({ ok: true, task: t }); });
router.put('/tasks/:id', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, task: tk.taskStore.update(req.params.id, req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tasks/:id/status', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, task: tk.taskStore.setStatus(req.params.id, (req.body || {}).status) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/tasks/:id/assign', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, task: tk.taskStore.assign(req.params.id, (req.body || {}).assignee) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/overdue', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: tk.reminders.overdue() }); });
router.get('/due-soon', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: tk.reminders.dueSoon() }); });
// Fire due reminders (wire to node-cron, or call manually/admin).
router.post('/reminders/tick', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await tk.reminders.tick()) }); });

router.setNotifier = (fn) => (tk ? tk.notify.setNotifier(fn) : false);

module.exports = router;
