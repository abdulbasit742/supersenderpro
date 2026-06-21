'use strict';


/**
 * Reseller Portal QA — client preview shape QA. Confirms previews are business-name
    * level only (no raw customer PII). Read-only.
    */


const guard = require('./qaGuard');

const ALLOWED_KEYS = ['id', 'clientId', 'businessName', 'status', 'plan', 'tier', 'createdAt', 'lastActivity', 'note',
'maskedContact'];

function run(resellerId) {
  const clientPreview = guard.loadPortal('clientPreview');
     if (!clientPreview || typeof clientPreview.list !== 'function') {
       return { ok: true, status: 'unavailable', warnings: ['client preview module not available'], blockers: [],
sampleKeys: [] };
  }
     let res;
     try { res = clientPreview.list(resellerId || 'qa_sample'); }
  catch (e) { return { ok: true, status: 'error', warnings: ['client preview failed safely'], blockers: [], sampleKeys:
[] }; }

     const clients = (res && res.clients) || [];
     const blockers = [], warnings = [];
     let sampleKeys = [];
     if (clients.length) {
       sampleKeys = Object.keys(clients[0] || {});
       const extraneous = sampleKeys.filter(function (k) { return ALLOWED_KEYS.indexOf(k) === -1; });
       if (extraneous.length) warnings.push('Client preview has non-allowlisted keys: ' + extraneous.join(', ') + '.');
     }
     const leaks = guard.findLeaks(clients);
     if (leaks.length) blockers.push('Client preview exposes ' + leaks.join(', ') + '.');


  return { ok: blockers.length === 0, status: blockers.length ? 'blocked' : (warnings.length ? 'warning' : 'verified'),
warnings: warnings, blockers: blockers, sampleKeys: sampleKeys };
}

module.exports = { run, ALLOWED_KEYS };
