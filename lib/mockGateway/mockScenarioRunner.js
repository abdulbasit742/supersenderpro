'use strict';


/**
 * Mock Gateway — runs a named scenario or a direct provider preview. Offline only.
    */


const registry = require('./mockRegistry');
const scenarios = require('./mockScenarios');
const mockRequest = require('./mockRequest');
const mockResponse = require('./mockResponse');
const eventStore = require('./mockEventStore');

// Run a provider preview directly.
function runProvider(providerName, input) {
     const mod = registry.get(providerName);
     if (!mod || typeof mod.runPreview !== 'function') {
    return mockResponse.build({ ok: false, provider: providerName, action: 'preview', status: 'unavailable', blockers:
['provider simulator not available'] });
     }
     const prepared = mockRequest.prepare(providerName, (input && input.action) || 'preview', input);
     let result;
     try { result = mod.runPreview(Object.assign({}, input, { sanitized: prepared.sanitized })); }
  catch (e) { result = mockResponse.build({ ok: false, provider: providerName, status: 'error', blockers: ['simulator failed safely'] }); }
  const resp = result && result.provider ? result : mockResponse.build(Object.assign({ provider: providerName },
result));
     eventStore.record({ provider: resp.provider, action: resp.action, status: resp.status, warnings: resp.warnings });
     return resp;
}

// Run a named scenario (maps to a provider + sample input).
function runScenario(id) {
     const sc = scenarios.get(id);
     if (!sc) return mockResponse.build({ ok: false, provider: 'scenario', status: 'unknown', blockers: ['unknown scenario: ' + id] });
  return runProvider(sc.provider, Object.assign({ action: sc.action }, sc.sampleInput || {}));
}


module.exports = { runProvider, runScenario };
