'use strict';

/**
 * Reseller Portal QA — partner asset QA. Reads the existing assetLibrary read-only
 * and asserts required assets exist, include consent-safe note, and contain no
 * spam/cold-outreach instructions, guaranteed-earnings claims, or secrets.
 */

const guard = require('./qaGuard');


const REQUIRED = ['sales', 'demo', 'pricing', 'onboarding', 'objection'];
const BANNED_PHRASES = ['guaranteed earnings', 'guaranteed income', 'get rich', 'cold outreach', 'scrape', 'buy a list',
'spam', 'mass dm'];


function run() {
  const assets = guard.loadPortal('assetLibrary');
  if (!assets || typeof assets.list !== 'function') {
    return { ok: false, status: 'unavailable', warnings: ['asset library module not available'], blockers: [],
availableTypes: [] };
  }


  let types = [];
  try { types = assets.list() || []; } catch (e) { types = []; }
  const blockers = [], warnings = [];


  REQUIRED.forEach(function (need) {
    if (!types.some(function (t) { return String(t).toLowerCase().indexOf(need) !== -1; })) warnings.push('Missing asset category: ' + need + '.');
  });

  // Sample a few generated drafts and scan for banned phrases + consent note + secrets.
  let consentNoteSeen = false;
  (types.slice(0, 8)).forEach(function (type) {
    let draft;
      try { draft = assets.generate ? assets.generate(type, 'roman_urdu') : null; } catch (e) { draft = null; }
      const text = draft ? JSON.stringify(draft).toLowerCase() : '';
    BANNED_PHRASES.forEach(function (p) { if (text.indexOf(p) !== -1) blockers.push('Asset "' + type + '" contains banned phrase: ' + p + '.'); });
      if (/opt-out|consent|reply stop|unsubscribe/i.test(text)) consentNoteSeen = true;
      const leaks = guard.findLeaks(draft || {});
      if (leaks.length) blockers.push('Asset "' + type + '" exposes ' + leaks.join(', ') + '.');

});


if (!consentNoteSeen) warnings.push('No consent-safe / opt-out note detected in sampled assets.');


return { ok: blockers.length === 0, status: blockers.length ? 'blocked' : (warnings.length ? 'warning' : 'verified'),
warnings: warnings, blockers: blockers, availableTypes: types };
}


module.exports = { run, REQUIRED, BANNED_PHRASES };
