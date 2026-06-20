// developerPortal/webhookSigning.js — signing secret PREVIEW + payload signature preview.
// Never exposes the real signing secret; stores only a hash + masked preview.
const crypto = require('crypto');
function newSecret(){
  const raw = 'whsec_' + crypto.randomBytes(20).toString('hex');
  return { raw, preview: raw.slice(0,10)+'...'+raw.slice(-4), hash: crypto.createHash('sha256').update(raw).digest('hex') };
}
// Sign a payload string with a provided secret (used only in preview/simulation).
function sign(secret, body){ return 'sha256='+crypto.createHmac('sha256', secret).update(body).digest('hex'); }
module.exports = { newSecret, sign };
