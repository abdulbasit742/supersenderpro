'use strict';
/**
 * lib/guidedDemo/demoStepRunner.js
 * Preview-only runner: checks each step's page (public/*.html) exists on disk and whether
 * its route module is present. Never calls external APIs, never runs live actions.
 */
const fs = require('fs');
const path = require('path');
const registry = require('./demoJourneyRegistry');
const safety = require('./demoSafety');
const redactor = require('./demoRedactor');
const ROOT = process.cwd();
function pageExists(page) { if (!page) return false; const rel = page.replace(/^\//, ''); try {
fs.accessSync(path.join(ROOT, 'public', rel)); return true; } catch { try { fs.accessSync(path.join(ROOT, rel)); return
true; } catch { return false; } } }
function routeExists(apiEndpoint) {
  if (!apiEndpoint) return false;
  // map /api/<segment>/... to a likely route file; presence check only, never calls it
  const m = apiEndpoint.match(/^\/api\/([a-z0-9-]+)/i); if (!m) return false;
  const seg = m[1];
  const candidates = ['routes/' + seg + 'Routes.js', 'routes/' + seg.replace(/-/g, '') + 'Routes.js', 'routes/' +
seg.replace(/-([a-z])/g, (_x, c) => c.toUpperCase()) + 'Routes.js'];
  return candidates.some((c) => { try { fs.accessSync(path.join(ROOT, c)); return true; } catch { return false; } });
}
function runStep(s) {
  const pe = pageExists(s.page);
  const re = routeExists(s.apiEndpoint);
  const status = pe || re ? 'ready' : 'fallback';
  return {
    stepId: s.id, title: s.title, status, pageExists: pe, routeExists: re,
    mockAvailable: safety.mockProvidersOnly(), sampleDataAvailable: safety.sampleDataOnly(),
    expectedResult: s.expectedResult, actualPreview: status === 'ready' ? redactor.redact('Preview ready: ' + (s.page ||
s.apiEndpoint)) : null,
    blockers: status === 'fallback' && /required/i.test(s.fallbackIfUnavailable || '') ? ['module_unavailable'] : [],
    warnings: status === 'fallback' ? ['using_fallback: ' + s.fallbackIfUnavailable] : [],
    talkingPoints: s.talkingPoints, fallbackIfUnavailable: s.fallbackIfUnavailable, dryRun: true,
  };
}
function run(journeyId) {
  const j = registry.get(journeyId); if (!j) return { ok: false, errors: ['unknown_journey'] };
  const steps = j.steps.map(runStep);
  const ready = steps.filter((s) => s.status === 'ready').length;
  return { ok: true, dryRun: true, liveActionsEnabled: false, journey: { id: j.id, title: j.title, audience: j.audience

}, steps, summary: { total: steps.length, ready, fallback: steps.length - ready }, safety: safety.panel() };
}
module.exports = { run, runStep, pageExists, routeExists };
