'use strict';

/**
    * Mock Gateway — normalizes + sanitizes an incoming request before simulation.
    */


const sanitizer = require('./mockInputSanitizer');

function prepare(provider, action, input) {
     const s = sanitizer.sanitize(input || {});
     return {
         provider: provider || 'unknown',
         action: action || 'preview',
         sanitized: s.redacted,
         findings: s.findings,
     };
}


module.exports = { prepare };
