// routes/complianceCenterRoutes.js — Express router for the Compliance & Consent Center.
// Mounted at /api/compliance. Consent-first. No external calls; no sending.
const express = require('express');
const router = express.Router();
const C = require('../lib/complianceCenter');
const { maskSubject } = require('../lib/complianceCenter/privacy');

function safe(fn){ return async (req,res)=>{ try{ const o=await fn(req,res); if(o!==undefined&&!res.headersSent) res.json(o); }catch(e){ res.status(500).json({ok:false,error:e.message||'compliance_error'}); } }; }

router.get('/status', safe(()=>({ ok:true, enabled:C.config.enabled, consentFirst:C.config.consentFirst,
  quietHours:{start:C.config.quietHoursStart,end:C.config.quietHoursEnd,timezone:C.config.timezone} })));
router.get('/summary', safe(()=>({ ok:true, summary:C.reportBuilder.summary() })));
router.get('/rules', safe(()=>({ ok:true, rules:Object.values(C.complianceRules) })));
router.get('/registry', safe(()=>({ ok:true, records:C.consentRegistry.all().map((r)=>({...r, subjectId:maskSubject(r.subjectId)})) })));

router.get('/consent/:subjectId', safe((req)=>({ ok:true, consent:{...C.consentRegistry.get(req.params.subjectId), subjectIdMasked:maskSubject(req.params.subjectId)} })));
router.post('/consent/:subjectId', safe((req)=>({ ok:true, consent:C.consentRegistry.set(req.params.subjectId, (req.body||{}).channels||{}, 'api') })));
router.post('/opt-out/:subjectId', safe((req)=>({ ok:true, consent:C.optOutManager.optOut(req.params.subjectId, 'api') })));

// Policy decision — never sends, only decides.
router.post('/check', safe((req)=>{
  const { subjectId, channel='whatsapp', ignoreQuietHours=false } = req.body||{};
  if(!subjectId) return { ok:false, error:'subjectId required' };
  return { ok:true, decision:C.policyChecker.canContact(subjectId, channel, { ignoreQuietHours }) };
}));

router.get('/audit', safe((req)=>({ ok:true, audit:C.auditLog.list({ limit:Number(req.query.limit)||100 }) })));

module.exports = router;
