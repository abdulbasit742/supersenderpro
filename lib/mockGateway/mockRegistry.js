'use strict';

/**
 * Mock Gateway — provider registry. Loads provider simulators defensively.
    */

const PROVIDERS = [

     'whatsappBaileysMock', 'whatsappCloudMock', 'channelPublisherMock', 'socialPublisherMock',
     'ecommerceMock', 'paymentVerifierMock', 'webhookDeliveryMock', 'aiProviderMock',
     'voiceAIMock', 'emailMock', 'billingMock', 'tenantMock', 'supportMock',
     'developerPortalMock', 'auditSecurityMock',
];

function load(name) { try { return require('./providers/' + name); } catch (e) { return null; } }


function list() {
     return PROVIDERS.map(function (name) {
       const mod = load(name);
    let status = { provider: name, available: false, mode: 'mock', dryRun: true, externalCallsEnabled: false,
liveActionsEnabled: false, warnings: ['simulator not available'], blockers: [] };
         if (mod && typeof mod.getStatus === 'function') { try { status = mod.getStatus(); } catch (e) { /* keep default */ }
}
       return { name: name, status: status };
     });
}


function get(name) { return load(name); }
function names() { return PROVIDERS.slice(); }


module.exports = { PROVIDERS, list, get, names, load };
