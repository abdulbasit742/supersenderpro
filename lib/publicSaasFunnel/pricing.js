'use strict';
const path = require('path');
function tryRequire(rels){ for(const r of rels){ try{return require(path.resolve(process.cwd(),r));}catch(e){} } return null; }
const billing = tryRequire(['lib/saasBilling/index','src/modules/billing']);
const FALLBACK = [
 { id:'starter', name:'Starter', price:999, currency:'PKR', period:'mo', features:['1 WhatsApp number','Basic campaigns','Demo sandbox'] },
 { id:'pro', name:'Pro', price:2499, currency:'PKR', period:'mo', features:['Official + unofficial WhatsApp','Automations','Analytics'] },
 { id:'business', name:'Business', price:4999, currency:'PKR', period:'mo', features:['Multi-channel','Voice AI','Owner Command'] },
 { id:'agency', name:'Agency', price:9999, currency:'PKR', period:'mo', features:['White-label','Reseller portal','Priority support'] },
];
function plans(){ if(billing && typeof billing.publicPlans==='function'){ try{ const p=billing.publicPlans(); if(Array.isArray(p)&&p.length) return {source:'saas_billing',plans:p}; }catch(e){} } return {source:'fallback',plans:FALLBACK}; }
module.exports = { plans, FALLBACK };
