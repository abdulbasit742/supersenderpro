'use strict';
/**
 * appointments.js — Booking Feature #1: WhatsApp-native appointment scheduling.
 *
 * Service businesses (salons, clinics, tutors) live on bookings. This lets a tenant define their
 * availability (weekly working hours + slot length), exposes free slots for any date, and books /
 * cancels appointments tied to a contact — preventing double-booking. On booking it can fire a
 * reminder hook so the reminders/notifications layer nudges the customer before the slot.
 *
 * Storage: JSON (data/appointments.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'appointments.json');

let onBooked = null; // (appointment) => void  (e.g. create a reminder / send confirmation)
function setOnBooked(fn) { onBooked = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { availability: {}, appointments: [] }; }
  catch { return { availability: {}, appointments: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Set weekly availability for a tenant.
 * @param {string} tenantId
 * @param {Object} weekly  { mon:[['09:00','17:00']], tue:[...], ... }  (array of [start,end] ranges)
 * @param {number} slotMinutes  default 30
 */
function setAvailability(tenantId, weekly = {}, slotMinutes = 30) {
  const data = load();
  data.availability[String(tenantId)] = { weekly, slotMinutes: Number(slotMinutes) || 30, updatedAt: nowIso() };
  save(data);
  return data.availability[String(tenantId)];
}
function getAvailability(tenantId) {
  return load().availability[String(tenantId)] || null;
}

function toMin(hhmm) { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); }
function toHHMM(min) { const h = Math.floor(min / 60), m = min % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }

/**
 * Free slots for a tenant on a given ISO date (YYYY-MM-DD). Excludes already-booked slots.
 */
function freeSlots(tenantId, isoDate) {
  const avail = getAvailability(tenantId);
  if (!avail) return [];
  const day = DOW[new Date(`${isoDate}T00:00:00`).getDay()];
  const ranges = (avail.weekly && avail.weekly[day]) || [];
  const slotLen = avail.slotMinutes;
  const data = load();
  const booked = new Set(
    data.appointments
      .filter(a => a.tenantId === String(tenantId) && a.date === isoDate && a.status === 'booked')
      .map(a => a.time)
  );
  const slots = [];
  for (const [start, end] of ranges) {
    for (let t = toMin(start); t + slotLen <= toMin(end); t += slotLen) {
      const hhmm = toHHMM(t);
      if (!booked.has(hhmm)) slots.push(hhmm);
    }
  }
  return slots;
}

/**
 * Book an appointment. Rejects if the slot isn't free.
 * @param {Object} opts { tenantId, contactPhone, date (YYYY-MM-DD), time (HH:MM), service?, name? }
 */
function book(opts = {}) {
  const tenantId = String(opts.tenantId || '');
  const phone = normPhone(opts.contactPhone);
  if (!tenantId || !phone) throw new Error('tenantId and contactPhone required');
  if (!opts.date || !opts.time) throw new Error('date and time required');
  if (!freeSlots(tenantId, opts.date).includes(opts.time)) throw new Error('slot not available');

  const data = load();
  const appt = {
    id: `APT-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId,
    contactPhone: phone,
    name: opts.name || '',
    service: opts.service || '',
    date: opts.date,
    time: opts.time,
    status: 'booked',
    createdAt: nowIso()
  };
  data.appointments.push(appt);
  save(data);
  if (onBooked) { try { onBooked(appt); } catch { /* ignore */ } }
  return appt;
}

function cancel(id) {
  const data = load();
  const a = data.appointments.find(x => x.id === id);
  if (!a) return null;
  a.status = 'cancelled';
  a.cancelledAt = nowIso();
  save(data);
  return a;
}

function listAppointments(filter = {}) {
  let rows = load().appointments;
  if (filter.tenantId) rows = rows.filter(a => a.tenantId === String(filter.tenantId));
  if (filter.contactPhone) rows = rows.filter(a => a.contactPhone === normPhone(filter.contactPhone));
  if (filter.date) rows = rows.filter(a => a.date === filter.date);
  if (filter.status) rows = rows.filter(a => a.status === filter.status);
  rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return rows;
}

module.exports = { setOnBooked, setAvailability, getAvailability, freeSlots, book, cancel, listAppointments };
