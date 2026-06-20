#!/usr/bin/env node
// scripts/demo-sandbox-check.js — Validates the Demo Sandbox install + sample run.
// Never exposes secrets. Exits 0 unless DEMO_SANDBOX_STRICT=true and blockers exist.
const fs=require('fs'); const path=require('path'); const ROOT=path.join(__dirname,'..');
const checks=[]; const add=(n,ok,d='')=>checks.push({name:n,ok:!!ok,detail:d}); const exists=(r)=>fs.existsSync(path.join(ROOT,r));

// File presence
['lib/demoSandbox/index.js','lib/demoSandbox/demoConfig.js','lib/demoSandbox/demoModeGuard.js',
 'lib/demoSandbox/demoDataFactory.js','lib/demoSandbox/scenarioRegistry.js','lib/demoSandbox/scenarioRunner.js',
 'lib/demoSandbox/tourRegistry.js','lib/demoSandbox/tourState.js','lib/demoSandbox/demoReset.js',
 'routes/demoSandboxRoutes.js','public/demo-sandbox.html','public/js/demo-sandbox.js','public/css/demo-sandbox.css',
 'public/js/demo-tour.js','public/css/demo-tour.css'].forEach(f=>add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT,'server.js'),'utf8').includes('DEMO SANDBOX HOOK'));
add('env placeholders present', exists('.env.example') && fs.readFileSync(path.join(ROOT,'.env.example'),'utf8').includes('DEMO_SANDBOX_ENABLED'));
['DEMO_SANDBOX.md','DEMO_SCENARIOS.md','GUIDED_PRODUCT_TOURS.md','DEMO_DATA_SAFETY.md','DEMO_PUBLIC_FUNNEL_INTEGRATION.md'].forEach(d=>add(`doc ${d}`, exists(`docs/${d}`)));

// Functional run
let doc;
try{
  const D=require('../lib/demoSandbox');
  const data=D.factory.generateAll('ai_tools_reseller');
  add('demo data generated', data.demo===true && Array.isArray(data.customers) && data.customers.length>0);
  const sc=D.scenarioRunner.start('ai_tools_reseller');
  add('sample scenario starts', sc.ok===true && Array.isArray(sc.tourSteps));
  add('tour steps generated', sc.tourSteps.length>0 || D.tourRegistry.get('customer_360').steps.length>0);
  const blocked=D.guard.simulate('send_whatsapp');
  add('live actions blocked', blocked.blocked===true);
  doc=D.doctor();
  add('doctor reports demo+dryRun', doc.demo===true && doc.dryRun===true && doc.blockLiveActions===true);
  // Leak scan
  const blob=JSON.stringify(data);
  const leak=/\b\d{10,}\b/.test(blob) || /[a-zA-Z0-9._%+-]+@(?!demo\.invalid)[a-zA-Z0-9.-]+\.[a-z]{2,}/.test(blob) || /sk-[A-Za-z0-9]{10,}/.test(blob);
  add('no PII/secret leak in demo data', !leak);
}catch(e){ add('functional pipeline', false, e.message); }

const passed=checks.filter(c=>c.ok).length, failed=checks.filter(c=>!c.ok).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:checks.length,strict:String(process.env.DEMO_SANDBOX_STRICT||'false'),doctor:doc||null,checks};
const dir=path.join(ROOT,'artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'demo_sandbox_check.json'), JSON.stringify(out,null,2));
let md=`# Demo Sandbox Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach(c=>{ md+=`| ${c.name} | ${c.ok?'✅':'❌'} | ${String(c.detail).slice(0,60)} |\n`; });
fs.writeFileSync(path.join(dir,'demo_sandbox_check.md'), md); console.log(md);
const strict=String(process.env.DEMO_SANDBOX_STRICT||'').toLowerCase()==='true';
process.exit((strict && failed>0)?1:0);
