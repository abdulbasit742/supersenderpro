// lib/dripCampaigns/enrollmentEngine.js — Enroll contacts into journeys via events and advance
// due steps on a tick. Per-contact-per-journey dedupe (active enrollment is never duplicated).
// A stopOnEvent unenrolls active enrollments. Quiet hours + a daily per-contact cap protect
// the contact. Sends are draft-only unless live sends + a notifier are enabled.

const store = require('./store');
const { config } = require('./config');
const journeyStore = require('./journeyStore');
const notify = require('./notify');
const mergeRender = require('./mergeRender');
const { maskContact } = require('./privacy');

const MIN = 60 * 1000;

function publicView(e) {
 if (!e) return null;
 return {
 id: e.id, journeyId: e.journeyId, contactMasked: maskContact(e.contact),
 status: e.status, currentStep: e.currentStep, totalSteps: e.totalSteps,
 nextStepDueAt: e.nextStepDueAt, enrolledAt: e.enrolledAt, completedAt: e.completedAt || null,
 stoppedAt: e.stoppedAt || null, stoppedReason: e.stoppedReason || null,
 };
}

function _activeEnrollment(d, journeyId, contact) {
 return d.enrollments.find((e) => e.journeyId === journeyId && String(e.contact) === String(contact) && e.status === 'active') || null;
}

function _scheduleFirst(journey, fromMs) {
 const first = journey.steps[0];
 if (!first) return null;
 return new Date(fromMs + first.waitMinutes * MIN).toISOString();
}

// Fire an event: enroll into every active journey whose trigger matches; honor stopOnEvent.
function handleEvent({ event, contact, name = '', context = {} } = {}) {
 if (!event) throw new Error('event is required');
 if (!contact) throw new Error('contact is required');
 const d = store.load();
 const now = Date.now();
 const results = { enrolled: [], stopped: [] };

 // Stop: any active enrollment whose journey is configured to stop on this event.
 for (const e of d.enrollments) {
 if (e.status !== 'active') continue;
 const j = d.journeys.find((x) => x.id === e.journeyId);
 if (j && j.stopOnEvent === event && String(e.contact) === String(contact)) {
 e.status = 'stopped'; e.stoppedAt = store.nowIso(); e.stoppedReason = 'stop_event:' + event;
 results.stopped.push(e.id);
 }
 }

 // Enroll: every active journey triggered by this event (skip if already active for contact).
 for (const j of d.journeys.filter((x) => x.trigger === event && x.active !== false)) {
 if (_activeEnrollment(d, j.id, contact)) continue;
 if (!j.steps.length) continue;
 const enr = {
 id: store.genId('enr'), journeyId: j.id, contact: String(contact), name: String(name || ''),
 context: context || {}, status: 'active', currentStep: 0, totalSteps: j.steps.length,
 nextStepDueAt: _scheduleFirst(j, now), enrolledAt: store.nowIso(),
 completedAt: null, stoppedAt: null, stoppedReason: null,
 };
 d.enrollments.push(enr);
 results.enrolled.push(enr.id);
 }
 store.save(d);
 return results;
}

function enrollManual(journeyId, { contact, name = '', context = {} } = {}) {
 if (!contact) throw new Error('contact is required');
 const j = journeyStore.get(journeyId);
 if (!j) throw new Error('journey not found');
 const d = store.load();
 if (_activeEnrollment(d, journeyId, contact)) return { already: true, enrollment: publicView(_activeEnrollment(d, journeyId, contact)) };
 const enr = {
 id: store.genId('enr'), journeyId, contact: String(contact), name: String(name || ''),
 context: context || {}, status: 'active', currentStep: 0, totalSteps: j.steps.length,
 nextStepDueAt: _scheduleFirst(j, Date.now()), enrolledAt: store.nowIso(),
 completedAt: null, stoppedAt: null, stoppedReason: null,
 };
 d.enrollments.push(enr); store.save(d);
 return { already: false, enrollment: publicView(enr) };
}

function _inQuietHours(date) {
 const h = date.getHours();
 const { quietStartHour: s, quietEndHour: e } = config;
 if (s === e) return false;
 return s < e ? (h >= s && h < e) : (h >= s || h < e);
}
function _deferPastQuiet(date) {
 const d = new Date(date);
 while (_inQuietHours(d)) d.setHours(d.getHours() + 1, 0, 0, 0);
 return d;
}
function _sentTodayForContact(d, contact, refNow) {
 const dayStart = new Date(refNow); dayStart.setHours(0, 0, 0, 0);
 return d.sends.filter((s) => String(s.contact) === String(contact) && Date.parse(s.at) >= dayStart.getTime()).length;
}

// Advance all enrollments whose next step is due. Returns what was processed.
async function tick(refNow = Date.now()) {
 const d = store.load();
 const processed = [];
 for (const e of d.enrollments) {
 if (e.status !== 'active') continue;
 if (!e.nextStepDueAt || Date.parse(e.nextStepDueAt) > refNow) continue;
 const j = d.journeys.find((x) => x.id === e.journeyId);
 if (!j || !j.steps[e.currentStep]) { e.status = 'completed'; e.completedAt = store.nowIso(); continue; }

 // Daily per-contact cap.
 if (_sentTodayForContact(d, e.contact, refNow) >= config.maxStepsPerContactPerDay) {
 e.nextStepDueAt = new Date(refNow + 60 * MIN).toISOString();
 continue;
 }
 // Quiet hours: defer to window end.
 const dueDate = _deferPastQuiet(new Date(refNow));
 if (dueDate.getTime() > refNow) { e.nextStepDueAt = dueDate.toISOString(); continue; }

 const step = j.steps[e.currentStep];
 const message = mergeRender.render(step.message, Object.assign({ name: e.name }, e.context));
 const res = await notify.dispatch(e.contact, message, { kind: 'drip_step', journeyId: j.id, stepId: step.id });
 d.sends.push({ id: store.genId('snd'), journeyId: j.id, enrollmentId: e.id, contact: e.contact, stepId: step.id, sent: res.sent, preview: res.preview || message, at: store.nowIso() });

 e.currentStep += 1;
 if (e.currentStep >= j.steps.length) {
 e.status = 'completed'; e.completedAt = store.nowIso(); e.nextStepDueAt = null;
 } else {
 e.nextStepDueAt = new Date(refNow + j.steps[e.currentStep].waitMinutes * MIN).toISOString();
 }
 processed.push({ enrollmentId: e.id, journeyId: j.id, stepId: step.id, sent: res.sent, preview: res.preview || message });
 }
 store.save(d);
 return { processed: processed.length, sent: processed.filter((p) => p.sent).length, drafted: processed.filter((p) => !p.sent).length, results: processed };
}

function stop(enrollmentId, reason = 'manual') {
 const d = store.load();
 const e = d.enrollments.find((x) => x.id === enrollmentId);
 if (!e) throw new Error('enrollment not found');
 e.status = 'stopped'; e.stoppedAt = store.nowIso(); e.stoppedReason = reason; e.nextStepDueAt = null;
 store.save(d);
 return publicView(e);
}

function listEnrollments({ journeyId, status, limit = 100 } = {}) {
 let items = store.load().enrollments;
 if (journeyId) items = items.filter((e) => e.journeyId === journeyId);
 if (status) items = items.filter((e) => e.status === status);
 return items.sort((a, b) => Date.parse(b.enrolledAt) - Date.parse(a.enrolledAt)).slice(0, limit).map(publicView);
}

function overview() {
 const d = store.load();
 const by = (s) => d.enrollments.filter((e) => e.status === s).length;
 return {
 generatedAt: store.nowIso(),
 liveSends: config.effective.liveSends,
 cards: {
 journeys: d.journeys.length,
 activeJourneys: d.journeys.filter((j) => j.active !== false).length,
 activeEnrollments: by('active'),
 completed: by('completed'),
 stopped: by('stopped'),
 stepsSent: d.sends.filter((s) => s.sent).length,
 stepsDrafted: d.sends.filter((s) => !s.sent).length,
 },
 };
}

module.exports = { handleEvent, enrollManual, tick, stop, listEnrollments, overview, publicView };
