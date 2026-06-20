#!/usr/bin/env node
// scripts/feature-flags-check.js — Validates Feature Flags install + sample run.
// Never exposes secrets/full PII. Exits 0 unless FEATURE_FLAGS_STRICT=true and blockers exist.
const fs=require('fs'); const path=require('path'); const ROOT=path.join(__dirname,'..');
const checks=[]; const add=(n,ok,d='')=>checks.push({name:n,ok:!!ok,detail:d}); const exists=(r)=>fs.existsSync(path.join(ROOT,r));

['lib/featureFlags/index.js','lib/featureFlags/store.js','lib/featureFlags/featureRegistry.js','lib/featureFlags/defaultFeatureRegistry.js',
 'lib/featureFlags/flagEvaluator.js','lib/featureFlags/rolloutPlanner.js','lib/featureFlags/emergencyKillSwitch.js','lib/featureFlags/killSwitches.js',
 'routes/featureFlagsRoutes.js','public/feature-flags.html','public/js/feature-flags.js','public/css/feature-flags.css'].forEach(f=>add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js')&&fs.readFileSync(path.join(ROOT,'server.js'),'utf8').includes('FEATURE FLAGS HOOK'));
add('env placeholders present', exists('.env.example')&&fs.readFileSync(path.join(ROOT,'.env.example'),'utf8').includes('FEATURE_FLAGS_ENABLED'));
add('gitignore protections present', exists('.gitignore')&&fs.readFileSync(path.join(ROOT,'.gitignore'),'utf8').includes('feature-flags'));
['FEATURE_FLAGS_COMMAND_CENTER.md','ROLLOUT_CONTROL_GUIDE.md','EMERGENCY_KILL_SWITCHES.md','FEATURE_ACCESS_EVALUATION.md',
 'PLAN_TENANT_RESELLER_FEATURE_ACCESS.md','FEATURE_FLAGS_APPROVAL_AUDIT.md','FEATURE_FLAGS_ADMIN_COMMANDS.md','FEATURE_FLAGS_FLOW_NODES.md'].forEach(d=>add(`doc ${d}`, exists(`docs/${d}`)));

let report;
try{
  const F=require('../lib/featureFlags');
  add('default registry loads (>=30)', F.registry.keys().length>=30, `${F.registry.keys().length} flags`);
  const t=F.evaluator.evaluate('whatsapp_automation',{ tenantId:'t1', userRole:'admin', planId:'business', betaGroup:true });
  add('evaluate sample (tenant/plan/reseller)', !!t.featureKey&&typeof t.allowed==='boolean');
  const planFree=F.evaluator.evaluate('developer_portal',{ planId:'free' });
  add('plan insufficiency → upgrade preview', planFree.allowed===false&&!!planFree.billingUpgradePreview);
  const roll=F.rolloutPreview.preview('whatsapp_automation',{ targetMode:'beta_only' });
  add('rollout preview dry-run', roll.ok===true&&roll.plan.dryRun===true);
  const kill=F.killSwitch.preview('voice_ai','security_risk');
  add('kill switch preview only', kill.ok===true&&kill.applied===false);
  add('live write disabled', F.flags.allowLiveWrite===false);
  add('kill switch write disabled', F.flags.allowKillSwitchWrite===false);
  report=F.report(); add('report generated', report.ok===true&&Array.isArray(report.flags));
  add('no secret/PII leak in report', !F.privacyGuard.hasLeak(report));
}catch(e){ add('functional pipeline', false, e.message); }

const passed=checks.filter(c=>c.ok).length, failed=checks.filter(c=>!c.ok).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:checks.length,strict:String(process.env.FEATURE_FLAGS_STRICT||'false'),checks};
const dir=path.join(ROOT,'artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'feature_flags_check.json'), JSON.stringify(out,null,2));
let md=`# Feature Flags Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach(c=>{ md+=`| ${c.name} | ${c.ok?'✅':'❌'} | ${String(c.detail).slice(0,60)} |\n`; });
fs.writeFileSync(path.join(dir,'feature_flags_check.md'), md); console.log(md);
const strict=String(process.env.FEATURE_FLAGS_STRICT||'').toLowerCase()==='true';
process.exit((strict&&failed>0)?1:0);
