// routes/appointmentRoutes.js — Booking #1: appointments.
//
// Wire-up (server.js) — on booking, auto-create a reminder + confirmation:
//   const appts = require('./lib/booking/appointments');
//   appts.setOnBooked((a) => {
//     require('./lib/crm/reminders').create({ contactPhone:a.contactPhone, text:`Appointment ${a.date} ${a.time}`, dueAt: new Date(`${a.date}T${a.time}`).getTime() - 3600000 });
//   });
//   app.use('/api/appointments', require('./routes/appointmentRoutes'));

const express = require('express');
const router = express.Router();

let appts;
try { appts = require('../lib/booking/appointments'); } catch { appts = null; }

function ensure(res) {
  if (!appts) { res.status(503).json({ ok: false, error: 'Appointments not available' }); return false; }
  return true;
}

// Set availability. Body: { tenantId, weekly, slotMinutes? }
router.post('/availability', (req, res) => {
  if (!ensure(res)) return;
  const { tenantId, weekly, slotMinutes } = req.body || {};
  if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId required' });
  res.json({ ok: true, availability: appts.setAvailability(tenantId, weekly || {}, slotMinutes) });
});

// Free slots. Query: ?tenantId=&date=YYYY-MM-DD
router.get('/slots', (req, res) => {
  if (!ensure(res)) return;
  const { tenantId, date } = req.query;
  if (!tenantId || !date) return res.status(400).json({ ok: false, error: 'tenantId and date required' });
  res.json({ ok: true, date, slots: appts.freeSlots(tenantId, date) });
});

// Book. Body: { tenantId, contactPhone, date, time, service?, name? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, appointment: appts.book(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List. Query: ?tenantId=&contactPhone=&date=&status=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, appointments: appts.listAppointments(req.query) });
});

// Cancel.
router.post('/:id/cancel', (req, res) => {
  if (!ensure(res)) return;
  const a = appts.cancel(req.params.id);
  if (!a) return res.status(404).json({ ok: false, error: 'Appointment not found' });
  res.json({ ok: true, appointment: a });
});

module.exports = router;
