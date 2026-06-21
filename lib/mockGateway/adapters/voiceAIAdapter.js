'use strict';
const b = require('./_base');
function status() { return b.anyExists(['src/modules/voice', 'lib/voiceAI']) ? b.ok('voiceAI') :
b.unavailable('voiceAI'); }
module.exports = { status };
