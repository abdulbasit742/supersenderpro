'use strict';
/** Registry over the default journeys + the optional demo/guided-demo-journeys.json override. */

 const fs = require('fs');
 const path = require('path');
 const defaults = require('./defaultJourneys');
 function load() {
   try { const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'demo/guided-demo-journeys.json'), 'utf8')); if
 (Array.isArray(j) && j.length) return j; } catch {}
   return defaults;
 }
 function list() { return load().map((j) => ({ id: j.id, title: j.title, audience: j.audience, durationMinutes:
 j.durationMinutes, steps: j.steps.length })); }
 function get(id) { return load().find((j) => j.id === id) || null; }
 module.exports = { list, get, load };
