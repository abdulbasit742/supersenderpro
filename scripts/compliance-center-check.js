#!/usr/bin/env node
// scripts/compliance-center-check.js — Validates Compliance Center install + sample run.
const fs=require('fs'); const path=require('path'); const ROOT=path.join(__dirname,'..');
const C=require('../lib/complianceCenter'); const { hasLeak }=require('../lib/complianceCenter/privacy');
const checks=[]; const add=(n,ok,d='')=>checks.push({name:n,ok:!!ok,detail:d}); const exists=(r)=>fs.existsSync(path.join(ROOT,r));
add('route module present', exists('routes/complianceCenterRoutes.js'));
add('server hook present', exists('server.js')&&fs.readFileSync(path.join(ROOT,'server.js'),'utf8').includes('COMPLIANCE CENTER HOOK'));
add('dashboard page present', exists('public/compliance-center.html'));
add('dashboard js present', exists('public/js/compliance-center.js'));
add('dashboard css present', exists('public/css/compliance-center.css'));
add('env placeholders present', exists('.env.example')&&fs.readFileSync(path.join(ROOT,'.env.example'),'utf8').includes('COMPLIANCE_ENABLED'));
['COMPLIANCE_CENTER.md','CONSENT_POLICY.md'].forEach(d=>add(`doc ${d}`, exists(`docs/${d}`)));
let summary;
try{
  C.consentRegistry.set('test_subject_1',{whatsapp:true});
  add('consent set', C.consentRegistry.get('test_subject_1').channels.whatsapp===true);
  const denied=C.policyChecker.canContact('test_subject_2','marketing');
  add('consent-first denies without consent', denied.allowed===false);
  C.optOutManager.optOut('test_subject_1');
  add('opt-out honored', C.policyChecker.canContact('test_subject_1','whatsapp').allowed===false);
  summary=C.reportBuilder.summary(); add('summary built', typeof summary.totalSubjects==='number');
}catch(e){ add('functional pipeline', false, e.message); }
add('no secret leak', summary?!hasLeak(JSON.stringify({summary,registry:C.consentRegistry.all()})):false);
const passed=checks.filter(c=>c.ok).length, failed=checks.filter(c=>!c.ok).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:checks.length,checks};
const dir=path.join(ROOT,'artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'compliance_center_check.json'), JSON.stringify(out,null,2));
let md=`# Compliance Center Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach(c=>{ md+=`| ${c.name} | ${c.ok?'✅':'❌'} | ${String(c.detail).slice(0,60)} |\n`; });
fs.writeFileSync(path.join(dir,'compliance_center_check.md'), md); console.log(md);
process.exit(failed>0?1:0);
