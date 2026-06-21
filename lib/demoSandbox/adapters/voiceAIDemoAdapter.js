'use strict';
const factory = require('../demoDataFactory');
module.exports = { preview: () => ({ demo: true, dryRun: true, voice: factory.voiceAI(), note: 'No audio generated or sent. Script preview only.' }) };
