// lib/demoSandbox/tourState.js — Tracks guided tour progress (demo-only, persisted locally).
'use strict';
const { paths } = require('./demoConfig');
const { readJSON, writeJSON, appendHistory } = require('./store');
const registry = require('./tourRegistry');

function start(tourId){
  const tour = registry.get(tourId);
  if (!tour) return { ok:false, error:'unknown_tour', tourId, demo:true };
  const saved = readJSON(paths.store, {});
  saved.tour = { tourId, currentIndex:0, total:tour.steps.length, startedAt:new Date().toISOString(), finished:false, demo:true };
  writeJSON(paths.store, saved);
  appendHistory(paths.history, { type:'tour_start', tour:tourId, demo:true });
  return { ok:true, demo:true, tourId, step:tour.steps[0]||null, index:0, total:tour.steps.length };
}

function step(tourId, direction='next'){
  const tour = registry.get(tourId);
  if (!tour) return { ok:false, error:'unknown_tour', tourId, demo:true };
  const saved = readJSON(paths.store, {});
  const st = (saved.tour && saved.tour.tourId === tourId) ? saved.tour : { tourId, currentIndex:0, total:tour.steps.length, finished:false };
  if (direction === 'next') st.currentIndex = Math.min(st.currentIndex + 1, tour.steps.length - 1);
  else if (direction === 'prev') st.currentIndex = Math.max(st.currentIndex - 1, 0);
  st.total = tour.steps.length;
  saved.tour = st; writeJSON(paths.store, saved);
  return { ok:true, demo:true, tourId, step:tour.steps[st.currentIndex]||null, index:st.currentIndex, total:tour.steps.length,
    progress: Math.round(((st.currentIndex+1)/tour.steps.length)*100) };
}

function finish(tourId){
  const saved = readJSON(paths.store, {});
  if (saved.tour && saved.tour.tourId === tourId){ saved.tour.finished = true; saved.tour.finishedAt = new Date().toISOString(); writeJSON(paths.store, saved); }
  appendHistory(paths.history, { type:'tour_finish', tour:tourId, demo:true });
  return { ok:true, demo:true, tourId, finished:true };
}

function getState(){ const saved = readJSON(paths.store, {}); return { ok:true, demo:true, tour: saved.tour || null }; }

module.exports = { start, step, finish, getState };
