'use strict';

/**
 * Mock Gateway — effective config snapshot (reporting only). The simulator never
    * acts on live flags; offlineOnly/dryRun are always effectively true in code.
    */


const safety = require('./mockSafety');

function get() {
     return {
       enabled: safety.enabled(),
         offlineOnly: true,
         dryRun: true,
         liveActionsEnabled: false,
         externalCallsEnabled: false,
         piiRedacted: safety.redactPII(),
         secretsRedacted: safety.redactSecrets(),
         sampleDataOnly: true,
     };
}


module.exports = { get };
