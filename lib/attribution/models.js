// lib/attribution/models.js
// The five classic attribution models. Each takes an ordered list of touchpoints
// (oldest -> newest, the touch that converted is last) and the conversion value,
// and returns an array of credit weights (summing to 1) aligned to the touches.
//
// Pure functions, no I/O, trivially testable. This is the heart of the engine —
// everything else just feeds journeys in and rolls credit up by channel/campaign.

const DAY = 86400000;

// First touch gets 100%.
function firstTouch(n) {
  const w = new Array(n).fill(0);
  if (n > 0) w[0] = 1;
  return w;
}

// Last touch gets 100%.
function lastTouch(n) {
  const w = new Array(n).fill(0);
  if (n > 0) w[n - 1] = 1;
  return w;
}

// Every touch shares equally.
function linear(n) {
  return new Array(n).fill(n ? 1 / n : 0);
}

// Time decay: touches closer to conversion get more credit. Half-life in days.
function timeDecay(touchTimes, convTime, halfLifeDays = 7) {
  const n = touchTimes.length;
  if (!n) return [];
  const lambda = Math.log(2) / (halfLifeDays * DAY);
  const raw = touchTimes.map((t) => Math.exp(-lambda * Math.max(0, convTime - t)));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((r) => r / sum);
}

// Position-based (U-shaped): 40% first, 40% last, 20% split among the middle.
function positionBased(n) {
  if (n === 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [0.5, 0.5];
  const w = new Array(n).fill(0);
  w[0] = 0.4;
  w[n - 1] = 0.4;
  const mid = 0.2 / (n - 2);
  for (let i = 1; i < n - 1; i++) w[i] = mid;
  return w;
}

const MODELS = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'];

// Compute weights for a named model given the touch timestamps + conversion time.
function weightsFor(model, touchTimes, convTime, opts = {}) {
  const n = touchTimes.length;
  switch (model) {
    case 'first_touch': return firstTouch(n);
    case 'last_touch': return lastTouch(n);
    case 'linear': return linear(n);
    case 'time_decay': return timeDecay(touchTimes, convTime, opts.halfLifeDays || 7);
    case 'position_based': return positionBased(n);
    default: return lastTouch(n);
  }
}

module.exports = { MODELS, weightsFor, firstTouch, lastTouch, linear, timeDecay, positionBased };
