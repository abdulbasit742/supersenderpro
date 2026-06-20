#!/usr/bin/env node
// tests/smoke/complianceCenterSmoke.js — Offline smoke test. No external calls, no sending.
const fs=require('fs'); const path=require('path'); const results=[];
function check(n,fn){ try{ results.push({name:n,pass:true,detail:fn()||'ok'}); }catch(e){ results.push({name:n,pass:false,detail:e.message}); } }
function assert(c,m){ if(!c) throw new Error(m||'assertion failed'); return true; }
let C;
check('require route module',()=>{ require('../../routes/complianceCenterRoutes'); return 'loaded'; });
check('require barrel',()=>{ C=require('../../lib/complianceCenter'); assert(C.policyChecker&&C.consentRegistry&&C.reportBuilder,'missing core'); return 'ok'; });
check('consent-first denies without consent',()=>{ const d=C.policyChecker.canContact('smoke_new_subject','marketing'); assert(d.allowed===false,'allowed without consent'); return d.reason; });
check('set consent then allowed (off quiet hours)',()=>{ C.consentRegistry.set('smoke_s1',{whatsapp:true}); const d=C.policyChecker.canContact('smoke_s1','whatsapp',{ignoreQuietHours:true}); assert(d.allowed===true,'not allowed after consent'); return 'allowed'; });
check('opt-out overrides consent',()=>{ C.optOutManager.optOut('smoke_s1'); const d=C.policyChecker.canContact('smoke_s1','whatsapp',{ignoreQuietHours:true}); assert(d.allowed===false,'opt-out ignored'); return d.reason; });
check('registry returns records',()=>{ const a=C.consentRegistry.all(); assert(Array.isArray(a)&&a.length>=1,'no records'); return `${a.length} records`; });
check('summary builds',()=>{ const s=C.reportBuilder.summary(); assert(typeof s.totalSubjects==='number','no summary'); return `${s.totalSubjects} subjects`; });
check('audit records events',()=>{ assert(C.auditLog.list().length>=1,'no audit'); return 'ok'; });
check('subject id masked in audit',()=>{ const a=C.auditLog.list({limit:5}); const leaked=a.some(e=>e.meta&&typeof e.meta.subjectId==='string'&&/\d{7,}/.test(e.meta.subjectId)); assert(!leaked,'subject id leaked'); return 'masked'; });
check('no secrets leak',()=>{ const { hasLeak }=require('../../lib/complianceCenter/privacy'); assert(!hasLeak(JSON.stringify({reg:C.consentRegistry.all(),sum:C.reportBuilder.summary()})),'leak'); return 'clean'; });
const passed=results.filter(r=>r.pass).length, failed=results.filter(r=>!r.pass).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:results.length,results};
const dir=path.join(__dirname,'..','..','artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'compliance_center_smoke.json'), JSON.stringify(out,null,2));
let md=`# Compliance Center Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md+=failed?` — ${failed} FAILED\n\n`:' — all passed ✅\n\n';
md+='| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r,i)=>{ md+=`| ${i+1} | ${r.name} | ${r.pass?'✅':'❌ FAIL'} | ${String(r.detail).replace(/\|/g,'/').slice(0,70)} |\n`; });
fs.writeFileSync(path.join(dir,'compliance_center_smoke.md'), md); console.log(md);
process.exit(failed===0?0:1);
