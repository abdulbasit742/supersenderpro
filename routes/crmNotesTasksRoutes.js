// routes/crmNotesTasksRoutes.js — CRM #3: notes + follow-up tasks.
//
// Wire-up (server.js):
//   const nt = require('./lib/crm/notesAndTasks');
//   nt.setTimelineRecorder((phone, ev) => require('./lib/crm/customer360').recordEvent(phone, ev));
//   app.use('/api/crm', require('./routes/crmNotesTasksRoutes'));

const express = require('express');
const router = express.Router();

let nt;
try { nt = require('../lib/crm/notesAndTasks'); } catch { nt = null; }

function ensure(res) {
  if (!nt) { res.status(503).json({ ok: false, error: 'CRM notes/tasks not available' }); return false; }
  return true;
}

// Notes for a customer.
router.get('/customer/:phone/notes', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, notes: nt.listNotes(req.params.phone) });
});
router.post('/customer/:phone/notes', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, note: nt.addNote(req.params.phone, (req.body || {}).body, (req.body || {}).authorId) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Tasks for a customer.
router.get('/customer/:phone/tasks', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, tasks: nt.listTasks({ customer: req.params.phone, status: req.query.status }) });
});
router.post('/customer/:phone/tasks', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, task: nt.addTask(req.params.phone, req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Complete a task.
router.post('/tasks/:id/complete', (req, res) => {
  if (!ensure(res)) return;
  const t = nt.completeTask(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: 'Task not found' });
  res.json({ ok: true, task: t });
});

// Work queues: what's due today / overdue across all customers (rep's daily list).
router.get('/tasks/due-today', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, tasks: nt.dueToday() });
});
router.get('/tasks/overdue', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, tasks: nt.overdue() });
});

module.exports = router;
