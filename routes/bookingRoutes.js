// routes/bookingRoutes.js — REST surface for Appointment Booking. Mount at /api/booking.

const express = require('express');
const router = express.Router();

let bk = null; try { bk = require('../lib/booking'); } catch (e) { bk = null; }
function guard(req, res) { if (!bk) { res.status(503).json({ ok: false, error: 'booking not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!bk) return res.json({ ok: false, error: 'booking not loaded' });
 const r = bk.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(bk.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...bk.bookingEngine.overview() }); });

// Services
router.post('/services', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, service: bk.serviceStore.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/services', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: bk.serviceStore.all() }); });
router.put('/services/:id', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, service: bk.serviceStore.update(req.params.id, req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Availability
router.get('/services/:id/slots', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...bk.availability.slotsFor(req.params.id, req.query.date) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Appointments
router.post('/appointments', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await bk.bookingEngine.book(req.body || {})) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/appointments', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: bk.bookingEngine.list({ serviceId: req.query.serviceId, contact: req.query.contact, status: req.query.status, limit: Number(req.query.limit) || 200 }) }); });
router.get('/appointments/:id', (req, res) => { if (!guard(req, res)) return; const a = bk.bookingEngine.get(req.params.id); if (!a) return res.status(404).json({ ok: false, error: 'appointment not found' }); res.json({ ok: true, appointment: a }); });
router.post('/appointments/:id/cancel', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, appointment: bk.bookingEngine.cancel(req.params.id, (req.body || {}).reason) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/appointments/:id/reschedule', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await bk.bookingEngine.reschedule(req.params.id, (req.body || {}).startAt)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/appointments/:id/status', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, appointment: bk.bookingEngine.setStatus(req.params.id, (req.body || {}).status) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Fire due reminders (wire to node-cron, or call manually/admin).
router.post('/reminders/tick', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await bk.bookingEngine.reminderTick()) }); });

router.setNotifier = (fn) => (bk ? bk.notify.setNotifier(fn) : false);

module.exports = router;
