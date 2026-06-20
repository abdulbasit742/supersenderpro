#!/usr/bin/env node
// tests/smoke/featureFlagsSmoke.js — Offline smoke test. No external APIs, no live writes, no live enable.
const fs=require('fs'); const path=require('path'); const results=[];
function check(n,fn){ try{ results.push({name:n,pass:true,detail:fn()||'ok'}); }catch(e){ results.push({name:n,pass:false,detail:e.message}); } }
function assert(c,m){ if(!c) throw new Error(m||'assertion failed'); return true; }
let F;
check('require feature registry',()=>{ require('../../lib/featureFlags/featureRegistry'); return 'ok'; });
check('require evaluator',()=>{ require('../../lib/featureFlags/flagEvaluator'); return 'ok'; });
check('require rollout planner',()=>{ require('../../lib/featureFlags/rolloutPlanner'); return 'ok'; });
check('require kill switch module',()=>{ require('../../lib/featureFlags/emergencyKillSwitch'); return 'ok'; });
check('require route module',()=>{ require('../../routes/featureFlagsRoutes'); return 'loaded'; });
check('barrel loads',()=>{ F=require('../../lib/featureFlags'); assert(F.registry&&F.evaluator&&F.killSwitch,'missing core'); return 'ok'; });
check('load default flags (>=30)',()=>{ assert(F.registry.keys().length>=30,'need 30'); return `${F.registry.keys().length} flags`; });
check('evaluate WhatsApp for sample tenant',()=>{ const d=F.evaluator.evaluate('whatsapp_automation',{ tenantId:'t_demo', userRole:'admin', planId:'business', betaGroup:true }); assert(typeof d.allowed==='boolean','no decision'); return `allowed=${d.allowed}`; });
check('evaluate Developer Portal for sample plan',()=>{ const d=F.evaluator.evaluate('developer_portal',{ planId:'free' }); assert(d.allowed===false&&d.billingUpgradePreview,'expected upgrade preview'); return 'plan_insufficient'; });
let roll;
check('generate rollout preview',()=>{ roll=F.rolloutPreview.preview('whatsapp_automation',{ targetMode:'percentage_preview', targetPercent:25 }); assert(roll.ok,'rollout failed'); return roll.plan.estimatedImpact; });
let kill;
check('generate kill switch preview',()=>{ kill=F.killSwitch.preview('voice_ai','security_risk'); assert(kill.ok&&kill.applied===false,'kill not preview'); return 'preview'; });
check('dryRun true',()=>{ assert(roll.plan.dryRun===true,'rollout not dry-run'); return 'dryRun=true'; });
check('live write disabled',()=>{ assert(F.flags.allowLiveWrite===false,'live write enabled'); const a=F.killSwitch.apply('voice_ai','security_risk'); assert(a.blocked===true,'kill apply not blocked'); return 'blocked'; });
check('approval required (high-risk rollout)',()=>{ const p=F.rolloutPlanner.plan('voice_ai',{ targetMode:'all' }); assert(p.ok&&p.plan.requiredApprovals.length>=1,'no approval required'); return 'approval'; });
check('no phone/email/token leaks',()=>{ const blob=JSON.stringify({f:F.registry.all(),rep:F.report(),roll,kill}); assert(!F.privacyGuard.hasLeak(blob),'leak detected'); return 'clean'; });

const passed=results.filter(r=>r.pass).length, failed=results.filter(r=>!r.pass).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:results.length,results};
const dir=path.join(__dirname,'..','..','artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'feature_flags_smoke.json'), JSON.stringify(out,null,2));
let md=`# Feature Flags Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md+=failed?` — ${failed} FAILED\n\n`:' — all passed ✅\n\n';
md+='| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r,i)=>{ md+=`| ${i+1} | ${r.name} | ${r.pass?'✅':'❌ FAIL'} | ${String(r.detail).replace(/\|/g,'/').slice(0,70)} |\n`; });
fs.writeFileSync(path.join(dir,'feature_flags_smoke.md'), md); console.log(md);
process.exit(failed===0?0:1);
