 'use strict';
 const mockResponse = require('../mockResponse');
 const redactor = require('../mockRedactor');

 function status(provider, warnings) {
   return { provider: provider, available: true, mode: 'mock', dryRun: true, externalCallsEnabled: false,
 liveActionsEnabled: false, warnings: warnings || [], blockers: [] };
 }
 function preview(provider, action, requestPreview, responsePreview, warnings) {
   return mockResponse.build({ provider: provider, action: action, status: 'simulated', requestPreview: requestPreview,
 responsePreview: responsePreview, warnings: warnings || [] });
 }
 function validate(input, requiredKeys) {
   const missing = (requiredKeys || []).filter(function (k) { return !(input && input[k] != null); });
   return { valid: missing.length === 0, missing: missing };
 }
 module.exports = { status, preview, validate, redact: redactor.redact };
