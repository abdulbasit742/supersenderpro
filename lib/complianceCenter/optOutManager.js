// lib/complianceCenter/optOutManager.js — Records and checks opt-outs (safe local write).
const { config } = require('./config');
const { readJSON, writeJSON } = require('./store');
const audit = require('./auditLog');
const registry = require('./consentRegistry');

function optOut(subjectId, source='api'){
  const d=readJSON(config.paths.registry,{records:{}}); d.records=d.records||{};
  const cur=d.records[subjectId]||registry.defaults(subjectId);
  cur.channels={whatsapp:false,voice:false,marketing:false,email:false,sms:false};
  cur.optedOut=true; cur.updatedAt=new Date().toISOString(); cur.source=source;
  d.records[subjectId]=cur; writeJSON(config.paths.registry,d); audit.record('opt_out',{subjectId,source}); return registry.get(subjectId);
}
function isOptedOut(subjectId){ return !!registry.get(subjectId).optedOut; }
module.exports = { optOut, isOptedOut };
