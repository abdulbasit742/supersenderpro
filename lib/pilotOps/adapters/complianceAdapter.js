'use strict';
const b = require('./_base');
// Provides consent status for follow-up gating. If no compliance module, fall back
// to the pilot's own consentGiven flag. function consentStatus(pilot) { const present = b.anyExists(['src/modules/compliance', 'lib/compliance']); if (!present) return { available: false, consentGiven: !!(pilot && pilot.consentGiven) };// Read-only: never opt anyone in/out here. return { available: true, consentGiven: !!(pilot && pilot.consentGiven), note: 'Compliance present; consent read-only.'};} function health() { return b.anyExists(['src/modules/compliance', 'lib/compliance']) ? b.ok('Compliance Center present'): b.unavailable('Compliance Center'); } module.exports = { consentStatus, health };
