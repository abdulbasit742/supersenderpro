'use strict';


/**
* Mock Gateway — standard mock response builder. Always dryRun + offlineOnly, redacted.
*/

const redactor = require('./mockRedactor');

function build(opts) {
 const o = opts || {};
    return {
      ok: o.ok !== false,
        provider: o.provider || 'unknown',
        action: o.action || 'preview',
        status: o.status || 'simulated',
        dryRun: true,
        offlineOnly: true,
        liveActionsEnabled: false,
        requestPreview: redactor.redact(o.requestPreview || {}),
        responsePreview: redactor.redact(o.responsePreview || {}),
        warnings: o.warnings || [],
        blockers: o.blockers || [],
        timestamp: new Date().toISOString(),
    };
}

module.exports = { build };
