// lib/booking/bookingEngine.js — Book / cancel / reschedule appointments conflict-free, and fire
// (draft-only) confirmations + due reminders. book() re-checks availability atomically before
// writing so two requests can't double-book the same slot. reschedule() frees the old slot and
// re-validates the new one. reminderTick() sends a one-time reminder N hours before each booked
// appointment. Pairs with customer 360 #46 (records a booking event when present).

const store = require('./store');
const { config } = require('./config');
const serviceStore = require('./serviceStore');
const availability = require('./availability');
const notify = require('./notify');
const { maskContact } = require('./privacy');

let c360 = null; try { c360 = require('../customer360'); } catch (_e) { c360 = null; }

function publicView(a) {
 if (!a) return null;
 return { id: a.id, serviceId: a.serviceId, serviceName: a.serviceName, contactMasked: a.contact ? maskContact(a.contact) : null, name: a.name || '', startAt: a.startAt, endAt: a.endAt, status: a.status, staff: a.staff || null, notes: a.notes || '', createdAt: a.createdAt };
}

function _confirmText(svc, a) { return `Your ${svc.name} appointment is confirmed for ${new Date(a.startAt).toISOString()}.` + (svc.staff ? ` With ${svc.staff}.` : ''); }
function _reminderText(svc, a) { return `Reminder: your ${svc.name} appointment is at ${new Date(a.startAt).toISOString()}.`; }

async function book({ serviceId, contact, name = '', startAt, notes = '' } = {}, refNow = Date.now()) {
 if (!serviceId) throw new Error('serviceId is required');
 if (!contact) throw new Error('contact is required');
 const svc = serviceStore.raw(serviceId);
 if (!svc) throw new Error('service not found');
 const ok = availability.isBookable(serviceId, startAt, refNow);
 if (!ok.ok) return { booked: false, reason: ok.reason };
 const d = store.load();
 // Re-check clash atomically right before write.
 const start = Date.parse(startAt); const end = Date.parse(ok.endAt);
 const clash = d.appointments.some((a) => a.serviceId === serviceId && a.status === 'booked' && start < Date.parse(a.endAt) && Date.parse(a.startAt) < end);
 if (clash) return { booked: false, reason: 'slot already booked' };
 const appt = {
 id: store.genId('apt'), serviceId, serviceName: svc.name, contact: String(contact), name: String(name || ''),
 startAt: new Date(start).toISOString(), endAt: ok.endAt, status: 'booked', staff: svc.staff || null, notes: String(notes || ''),
 createdAt: store.nowIso(),
 };
 d.appointments.push(appt); store.save(d);
 const res = await notify.dispatch(contact, _confirmText(svc, appt), { kind: 'booking_confirm', appointmentId: appt.id });
 if (c360) { try { c360.track({ contact, type: 'custom', meta: { event: 'appointment_booked', service: svc.name } }); } catch (_e) { /* ignore */ } }
 return { booked: true, appointment: publicView(appt), confirmation: { sent: res.sent, draft: !res.sent, blocked: !!res.blocked, preview: res.preview || null } };
}

function cancel(appointmentId, reason = '') {
 const d = store.load(); const a = d.appointments.find((x) => x.id === appointmentId);
 if (!a) throw new Error('appointment not found');
 a.status = 'cancelled'; a.cancelReason = String(reason || ''); a.updatedAt = store.nowIso();
 delete d.remindersFired[a.id];
 store.save(d);
 return publicView(a);
}
function setStatus(appointmentId, status) {
 const { STATUSES } = require('./config');
 if (!STATUSES.includes(status)) throw new Error('invalid status');
 const d = store.load(); const a = d.appointments.find((x) => x.id === appointmentId);
 if (!a) throw new Error('appointment not found');
 a.status = status; a.updatedAt = store.nowIso(); store.save(d);
 return publicView(a);
}

async function reschedule(appointmentId, newStartAt, refNow = Date.now()) {
 const d = store.load(); const a = d.appointments.find((x) => x.id === appointmentId);
 if (!a) throw new Error('appointment not found');
 if (a.status !== 'booked') return { rescheduled: false, reason: 'only booked appointments can be rescheduled' };
 // Temporarily ignore this appointment's own slot by checking availability excluding it.
 const ok = availability.isBookable(a.serviceId, newStartAt, refNow);
 if (!ok.ok) {
 // The only acceptable clash is the appointment's own current slot; re-check excluding self.
 const start = Date.parse(newStartAt); const svc = serviceStore.raw(a.serviceId);
 const end = start + (svc ? svc.durationMins : 0) * 60000;
 const others = d.appointments.filter((x) => x.id !== a.id && x.serviceId === a.serviceId && x.status === 'booked');
 const clash = others.some((x) => start < Date.parse(x.endAt) && Date.parse(x.startAt) < end);
 if (ok.reason === 'slot already booked' && !clash) { /* it clashed only with itself: allow */ a.startAt = new Date(start).toISOString(); a.endAt = new Date(end).toISOString(); }
 else return { rescheduled: false, reason: ok.reason };
 } else { a.startAt = new Date(Date.parse(newStartAt)).toISOString(); a.endAt = ok.endAt; }
 a.updatedAt = store.nowIso(); delete d.remindersFired[a.id]; store.save(d);
 return { rescheduled: true, appointment: publicView(a) };
}

// Fire one-time reminders for booked appointments within the reminder window.
async function reminderTick(refNow = Date.now()) {
 const d = store.load();
 const windowMs = config.reminderHoursBefore * 3600 * 1000;
 const results = [];
 for (const a of d.appointments) {
 if (a.status !== 'booked') continue;
 const start = Date.parse(a.startAt);
 if (start <= refNow) continue; // already started/past
 if (start - refNow > windowMs) continue; // not within reminder window yet
 if (d.remindersFired[a.id]) continue;
 const svc = serviceStore.raw(a.serviceId) || { name: a.serviceName };
 const res = await notify.dispatch(a.contact, _reminderText(svc, a), { kind: 'booking_reminder', appointmentId: a.id });
 d.remindersFired[a.id] = store.nowIso();
 results.push({ appointmentId: a.id, sent: res.sent, draft: !res.sent, blocked: !!res.blocked });
 }
 store.save(d);
 return { processed: results.length, sent: results.filter((r) => r.sent).length, drafted: results.filter((r) => !r.sent).length, results };
}

function list({ serviceId, contact, status, limit = 200 } = {}) {
 let items = store.load().appointments.slice();
 if (serviceId) items = items.filter((a) => a.serviceId === serviceId);
 if (contact) items = items.filter((a) => String(a.contact || '') === String(contact));
 if (status) items = items.filter((a) => a.status === status);
 return items.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).slice(0, limit).map(publicView);
}
function get(id) { return publicView(store.load().appointments.find((a) => a.id === id)); }

function overview(refNow = Date.now()) {
 const d = store.load();
 const booked = d.appointments.filter((a) => a.status === 'booked');
 return {
 generatedAt: store.nowIso(),
 liveMessages: config.effective.liveMessages,
 timezone: config.timezone,
 cards: {
 services: d.services.length,
 activeServices: d.services.filter((s) => s.active !== false).length,
 appointments: d.appointments.length,
 upcoming: booked.filter((a) => Date.parse(a.startAt) > refNow).length,
 cancelled: d.appointments.filter((a) => a.status === 'cancelled').length,
 completed: d.appointments.filter((a) => a.status === 'completed').length,
 },
 };
}

module.exports = { book, cancel, setStatus, reschedule, reminderTick, list, get, overview, publicView };
