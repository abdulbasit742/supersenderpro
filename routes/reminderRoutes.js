// routes/reminderRoutes.js — CRM #6: contact reminders.
//
// Wire-up (server.js):
//   const rem = require('./lib/crm/reminders');
//   rem.setNotifier((r) => require('./lib/notifications/notifications')
//     .notify(r.assigneeId || 'owner', { type:'support_escalated', body:`⏰ Reminder: ${r.text}`, urgent:true }));
//   require('node-cron').schedule('* * * * *', () => rem.tick().catch(()=>{}));
//   app.use('/api/crm/reminders', require('./routes/reminderRoutes'));

const express = require('express');
const router = express.Router();

let rem;
try { rem = require('../lib/crm/reminders'); } catch { rem = null; }

function ensure(res) {
  if (!rem) { res.status(503).json({ ok: false, error: 'Reminders not available' }); return false; }
  return true;
}

// List. Query: ?status=&assigneeId=&contactPhone=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, reminders: rem.list(req.query) });
});

// Create. Body: { contactPhone?, text, dueAt, assigneeId? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, reminder: rem.create(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/:id/complete', (req, res) => {
  if (!ensure(res)) return;
  const r = rem.complete(req.params.id);
  if (!r) return res.status(404).json({ ok: false, error: 'Reminder not found' });
  res.json({ ok: true, reminder: r });
});

// Snooze. Body: { minutes? }
router.post('/:id/snooze', (req, res) => {
  if (!ensure(res)) return;
  const r = rem.snooze(req.params.id, (req.body || {}).minutes || 60);
  if (!r) return res.status(404).json({ ok: false, error: 'Reminder not found' });
  res.json({ ok: true, reminder: r });
});

module.exports = router;
