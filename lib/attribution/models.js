// lib/attribution/models.js — 5 attribution models, weights sum to 1.
const DAY = 86400000;
function firstTouch(n) { const w = new Array(n).fill(0); if (n > 0) w[0] = 1; return w; }
function lastTouch(n) { const w = new Array(n).fill(0); if (n > 0) w[n - 1] = 1; return w; }
function linear(n) { return new Array(n).fill(n ? 1 / n : 0); }
function timeDecay(touchTimes, convTime, halfLifeDays = 7) { const n = touchTimes.length; if (!n) return []; const lambda = Math.log(2) / (halfLifeDays * DAY); const raw = touchTimes.map((t) => Math.exp(-lambda * Math.max(0, convTime - t))); const sum = raw.reduce((a, b) => a + b, 0) || 1; return raw.map((r) => r / sum); }
function positionBased(n) { if (n === 0) return []; if (n === 1) return [1]; if (n === 2) return [0.5, 0.5]; const w = new Array(n).fill(0); w[0] = 0.4; w[n - 1] = 0.4; const mid = 0.2 / (n - 2); for (let i = 1; i < n - 1; i++) w[i] = mid; return w; }
const MODELS = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'];
function weightsFor(model, touchTimes, convTime, opts = {}) { const n = touchTimes.length; switch (model) { case 'first_touch': return firstTouch(n); case 'last_touch': return lastTouch(n); case 'linear': return linear(n); case 'time_decay': return timeDecay(touchTimes, convTime, opts.halfLifeDays || 7); case 'position_based': return positionBased(n); default: return lastTouch(n); } }
module.exports = { MODELS, weightsFor, firstTouch, lastTouch, linear, timeDecay, positionBased };
