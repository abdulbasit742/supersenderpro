// routes/bookingRoutes.js
// Self-mountable Express router for AI appointment booking.
// Mount in server.js with a single line:
//     app.use('/api/booking', require('./routes/bookingRoutes'));

const express = require('express');
const router = express.Router();
const booking = require('../lib/booking/bookingEngine');

// POST /api/booking/request   Body: { storeId?, phone?, text, count? }
router.post('/request', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, text, count } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await booking.requestBooking({ storeId, phone, text, count: count || 3 })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/booking/slots?storeId=&date=&time=&count=
router.get('/slots', (req, res) => {
  try {
    const { storeId = 'default_store', date, time, count } = req.query;
    res.json({ success: true, slots: booking.findSlots({ storeId, date, time, count: count ? parseInt(count, 10) : 3 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/booking/confirm   Body: { storeId?, phone, ts, name?, service?, hold? }
router.post('/confirm', (req, res) => {
  try {
    const { storeId = 'default_store', phone, ts, name, service, hold } = req.body || {};
    if (!phone || !ts) return res.status(400).json({ success: false, error: 'phone and ts are required' });
    res.json({ success: true, ...booking.confirmSlot({ storeId, phone, ts, name, service, hold: hold === true }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/booking/cancel   Body: { storeId?, phone?, id? }
router.post('/cancel', (req, res) => {
  try {
    const { storeId = 'default_store', phone, id } = req.body || {};
    res.json({ success: true, ...booking.cancelBooking({ storeId, phone, id }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/booking/list?storeId=&status=&upcomingOnly=
router.get('/list', (req, res) => {
  try {
    const { storeId = 'default_store', status, upcomingOnly } = req.query;
    res.json({ success: true, bookings: booking.listBookings({ storeId, status, upcomingOnly: upcomingOnly === 'true' }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/booking/reminders?storeId=&withinHours=
router.get('/reminders', (req, res) => {
  try {
    const { storeId = 'default_store', withinHours } = req.query;
    res.json({ success: true, due: booking.dueReminders({ storeId, withinHours: withinHours ? parseFloat(withinHours) : 24 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/booking/reminded   Body: { storeId?, id }
router.post('/reminded', (req, res) => {
  try {
    const { storeId = 'default_store', id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'id is required' });
    res.json({ success: true, ...booking.markReminded({ storeId, id }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/booking/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: booking.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try {
    const { storeId = 'default_store', ...updates } = req.body || {};
    res.json({ success: true, config: booking.setConfig(storeId, updates) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/booking/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...booking.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
