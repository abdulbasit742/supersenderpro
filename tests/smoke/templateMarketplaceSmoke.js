#!/usr/bin/env node
// tests/smoke/templateMarketplaceSmoke.js — Offline smoke test. No external APIs, no sending, no live install.
const fs=require('fs'); const path=require('path'); const results=[];
function check(n,fn){ try{ results.push({name:n,pass:true,detail:fn()||'ok'}); }catch(e){ results.push({name:n,pass:false,detail:e.message}); } }
function assert(c,m){ if(!c) throw new Error(m||'assertion failed'); return true; }
let M;
check('require store/registry/catalog modules',()=>{ require('../../lib/templateMarketplace/store'); require('../../lib/templateMarketplace/templateRegistry'); require('../../lib/templateMarketplace/templateCatalog'); return 'ok'; });
check('require recipe/installer/import-export modules',()=>{ require('../../lib/templateMarketplace/recipeRegistry'); require('../../lib/templateMarketplace/blueprintInstaller'); require('../../lib/templateMarketplace/templateImportExport'); return 'ok'; });
check('require route module',()=>{ require('../../routes/templateMarketplaceRoutes'); return 'loaded'; });
check('barrel loads',()=>{ M=require('../../lib/templateMarketplace'); assert(M.registry&&M.installer&&M.recipes,'missing core'); return 'ok'; });
check('load default templates',()=>{ assert(M.registry.ids().length>=16,'need 16'); return `${M.registry.ids().length} templates`; });
check('validate AI Tools Reseller template',()=>{ const t=M.registry.get('tpl_ai_tools_reseller'); assert(t,'missing'); assert(M.validator.validate(t).ok,'invalid'); return 'valid'; });
check('validate Ecommerce Growth template',()=>{ const t=M.registry.get('tpl_ecommerce_growth'); assert(t,'missing'); assert(M.validator.validate(t).ok,'invalid'); return 'valid'; });
let prev;
check('generate install preview',()=>{ prev=M.installer.installPreview('tpl_ai_tools_reseller'); assert(prev.ok,'preview failed'); return `${prev.modulesAffected.length} modules`; });
check('dryRun true',()=>{ assert(prev.dryRun===true,'not dry-run'); return 'dryRun=true'; });
check('approvalRequired true',()=>{ assert(prev.approvalRequired===true,'approval missing'); return 'approval=true'; });
check('live install disabled',()=>{ assert((M.flags.allowInstall&&M.flags.allowLiveActions)===false,'live enabled'); const r=M.installer.install('tpl_ai_tools_reseller'); assert(r.blocked===true,'install not blocked'); return 'blocked'; });
check('recipes draft-only (no live actions)',()=>{ const r=M.recipePreview.preview('rcp_new_order_owner_alert'); assert(r.ok&&!r.steps.some(s=>s.live),'live action found'); return 'draft-only'; });
check('export redacted (no leak)',()=>{ const e=M.importExport.exportPack(); assert(e.ok===true,'leak in export'); return `${e.pack.count} templates`; });
check('no phone/email/token leaks',()=>{ const blob=JSON.stringify({t:M.registry.all(),r:M.recipes.all(),rep:M.report()});
  assert(!M.privacyGuard.hasLeak(blob),'leak detected'); return 'clean'; });

const passed=results.filter(r=>r.pass).length, failed=results.filter(r=>!r.pass).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:results.length,results};
const dir=path.join(__dirname,'..','..','artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'template_marketplace_smoke.json'), JSON.stringify(out,null,2));
let md=`# Template Marketplace Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md+=failed?` — ${failed} FAILED\n\n`:' — all passed ✅\n\n';
md+='| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r,i)=>{ md+=`| ${i+1} | ${r.name} | ${r.pass?'✅':'❌ FAIL'} | ${String(r.detail).replace(/\|/g,'/').slice(0,70)} |\n`; });
fs.writeFileSync(path.join(dir,'template_marketplace_smoke.md'), md); console.log(md);
process.exit(failed===0?0:1);
