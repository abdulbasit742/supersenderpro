'use strict';
/** Tracks per-tour progress in local demo store. */
const store = require('./store');
const tourRegistry = require('./tourRegistry');
function start(tourId) {
    const tour = tourRegistry.get(tourId);
    if (!tour) return { ok: false, errors: ['unknown_tour'] };
    const s = store.load();
    s.tourState[tourId] = { currentStep: tour.steps[0] ? tour.steps[0].id : null, startedAt: new Date().toISOString(),
finished: false };
  store.save(s);
    return { ok: true, tour: { id: tour.id, title: tour.title }, step: tour.steps[0] || null, total: tour.steps.length };
}
function advance(tourId, stepId) {
  const tour = tourRegistry.get(tourId); if (!tour) return { ok: false, errors: ['unknown_tour'] };
    const s = store.load(); const st = s.tourState[tourId] || {}; st.currentStep = stepId; store.save(s);
    const idx = tour.steps.findIndex((x) => x.id === stepId);
  return { ok: true, step: tour.steps[idx] || null, progress: idx >= 0 ? Math.round(((idx + 1) / tour.steps.length) *
100) : 0 };
}
function finish(tourId) { const s = store.load(); s.tourState[tourId] = Object.assign(s.tourState[tourId] || {}, {
finished: true, finishedAt: new Date().toISOString() }); store.save(s); return { ok: true, finished: true }; }
module.exports = { start, advance, finish };
