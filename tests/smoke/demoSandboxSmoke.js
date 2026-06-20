#!/usr/bin/env node
// tests/smoke/demoSandboxSmoke.js — Offline smoke test. No external calls, no sending, no real writes.
const fs=require('fs'); const path=require('path'); const results=[];
function check(n,fn){ try{ results.push({name:n,pass:true,detail:fn()||'ok'}); }catch(e){ results.push({name:n,pass:false,detail:e.message}); } }
function assert(c,m){ if(!c) throw new Error(m||'assertion failed'); return true; }
let cfg,factory,scenReg,scenRun,tourReg,tourState,D;

check('require demo config',()=>{ cfg=require('../../lib/demoSandbox/demoConfig'); assert(cfg.load().enabled!==undefined,'no config'); return 'ok'; });
check('require demo data factory',()=>{ factory=require('../../lib/demoSandbox/demoDataFactory'); assert(typeof factory.generateAll==='function','no factory'); return 'ok'; });
check('require scenario registry',()=>{ scenReg=require('../../lib/demoSandbox/scenarioRegistry'); assert(scenReg.ids().length>=10,'need 10 scenarios'); return `${scenReg.ids().length} scenarios`; });
check('require scenario runner',()=>{ scenRun=require('../../lib/demoSandbox/scenarioRunner'); assert(typeof scenRun.start==='function','no runner'); return 'ok'; });
check('require tour registry',()=>{ tourReg=require('../../lib/demoSandbox/tourRegistry'); assert(tourReg.ids().length>=10,'need 10 tours'); return `${tourReg.ids().length} tours`; });
check('require route module',()=>{ require('../../routes/demoSandboxRoutes'); return 'loaded'; });
check('barrel loads',()=>{ D=require('../../lib/demoSandbox'); assert(D.doctor&&D.factory&&D.scenarioRunner,'missing core'); return 'ok'; });

let sample;
check('generate sample demo data',()=>{ sample=factory.generateAll('ai_tools_reseller'); assert(sample.customers.length>0&&sample.orders.length>0,'no data'); return `${sample.customers.length} customers`; });
check('start AI Tools Reseller scenario',()=>{ const r=scenRun.start('ai_tools_reseller'); assert(r.ok===true,'scenario failed'); assert(r.recommendedPages.length>0,'no pages'); return `${r.recommendedPages.length} pages`; });
let tourState2=require('../../lib/demoSandbox/tourState');
check('start Customer 360 tour',()=>{ const r=tourState2.start('customer_360'); assert(r.ok===true&&r.step,'tour failed'); return r.step.title; });
check('demo=true everywhere',()=>{ assert(sample.demo===true&&sample.business.demo===true,'demo flag missing'); return 'demo=true'; });
check('dryRun=true everywhere',()=>{ assert(sample.dryRun===true&&sample.voiceAI.dryRun===true,'dryRun flag missing'); return 'dryRun=true'; });
check('live actions blocked',()=>{ const g=require('../../lib/demoSandbox/demoModeGuard'); const b=g.simulate('capture_payment'); assert(b.blocked===true,'payment not blocked'); const w=g.simulate('send_whatsapp'); assert(w.blocked===true,'whatsapp not blocked'); return 'blocked'; });
check('no phone/email/token leaks',()=>{ const blob=JSON.stringify(sample);
  const phone=/\b\d{10,}\b/.test(blob); const email=/[a-zA-Z0-9._%+-]+@(?!demo\.invalid)[a-zA-Z0-9.-]+\.[a-z]{2,}/.test(blob); const token=/sk-[A-Za-z0-9]{10,}/.test(blob);
  assert(!phone&&!email&&!token,`leak phone:${phone} email:${email} token:${token}`); return 'clean'; });

const passed=results.filter(r=>r.pass).length, failed=results.filter(r=>!r.pass).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:results.length,results};
const dir=path.join(__dirname,'..','..','artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'demo_sandbox_smoke.json'), JSON.stringify(out,null,2));
let md=`# Demo Sandbox Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md+=failed?` — ${failed} FAILED\n\n`:' — all passed ✅\n\n';
md+='| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r,i)=>{ md+=`| ${i+1} | ${r.name} | ${r.pass?'✅':'❌ FAIL'} | ${String(r.detail).replace(/\|/g,'/').slice(0,70)} |\n`; });
fs.writeFileSync(path.join(dir,'demo_sandbox_smoke.md'), md); console.log(md);
process.exit(failed===0?0:1);
