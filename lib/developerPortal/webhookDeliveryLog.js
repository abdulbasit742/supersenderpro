// developerPortal/webhookDeliveryLog.js — delivery log store (redacted).
const store = require('./store');
function load(){ return store.read(store.PATHS.deliveries(), { deliveries: [] }); }
function save(d){ return store.write(store.PATHS.deliveries(), d); }
function record(entry){
  const d = load();
  const rec = { id: 'dlog_'+Date.now()+'_'+Math.random().toString(16).slice(2,8), createdAt: new Date().toISOString(), ...entry };
  d.deliveries.unshift(rec);
  if (d.deliveries.length > 500) d.deliveries = d.deliveries.slice(0,500);
  save(d); return rec;
}
function list(subscriptionId, limit=100){
  const all = load().deliveries;
  return (subscriptionId ? all.filter(x=>x.subscriptionId===subscriptionId) : all).slice(0, limit);
}
module.exports = { record, list };
