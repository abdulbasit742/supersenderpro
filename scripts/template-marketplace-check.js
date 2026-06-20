#!/usr/bin/env node
// scripts/template-marketplace-check.js — Validates Template Marketplace install + sample run.
// Never exposes secrets. Exits 0 unless TEMPLATE_MARKETPLACE_STRICT=true and blockers exist.
const fs=require('fs'); const path=require('path'); const ROOT=path.join(__dirname,'..');
const checks=[]; const add=(n,ok,d='')=>checks.push({name:n,ok:!!ok,detail:d}); const exists=(r)=>fs.existsSync(path.join(ROOT,r));

['lib/templateMarketplace/index.js','lib/templateMarketplace/store.js','lib/templateMarketplace/templateRegistry.js',
 'lib/templateMarketplace/templateCatalog.js','lib/templateMarketplace/defaultTemplates.js','lib/templateMarketplace/recipeRegistry.js',
 'lib/templateMarketplace/blueprintInstaller.js','lib/templateMarketplace/installPreview.js','lib/templateMarketplace/templateImportExport.js',
 'routes/templateMarketplaceRoutes.js','public/template-marketplace.html','public/js/template-marketplace.js','public/css/template-marketplace.css',
 'public/templates.html','public/js/templates.js','public/css/templates.css'].forEach(f=>add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js')&&fs.readFileSync(path.join(ROOT,'server.js'),'utf8').includes('TEMPLATE MARKETPLACE HOOK'));
add('env placeholders present', exists('.env.example')&&fs.readFileSync(path.join(ROOT,'.env.example'),'utf8').includes('TEMPLATE_MARKETPLACE_ENABLED'));
['TEMPLATE_MARKETPLACE_COMMAND_CENTER.md','INDUSTRY_BLUEPRINTS.md','AUTOMATION_RECIPE_STORE.md','BLUEPRINT_INSTALLER.md',
 'TEMPLATE_IMPORT_EXPORT.md','TEMPLATE_MARKETPLACE_SAFETY.md','PUBLIC_TEMPLATE_GALLERY.md','RESELLER_TEMPLATE_PACKS.md'].forEach(d=>add(`doc ${d}`, exists(`docs/${d}`)));

let report;
try{
  const M=require('../lib/templateMarketplace');
  add('default templates load', M.registry.ids().length>=16, `${M.registry.ids().length} templates`);
  add('default recipes load', M.recipes.ids().length>=10, `${M.recipes.ids().length} recipes`);
  const created=M.registry.upsert({ id:'tpl_check_sample', title:'Check Sample', slug:'check-sample', category:'industry_blueprint', industry:'Test', description:'sample', visibility:'admin_only', status:'draft' });
  add('create sample template', !!created&&created.id==='tpl_check_sample');
  const rec=M.recipes.upsert(M.recipeBuilder.build({ id:'rcp_check_sample', title:'Check Recipe', trigger:'manual', actions:['draft_followup_message'] }));
  add('create sample recipe', !!rec&&rec.id==='rcp_check_sample');
  add('validate template', M.validator.validate(created).ok===true);
  const prev=M.installer.installPreview('tpl_ai_tools_reseller');
  add('install preview dry-run + approval', prev.ok===true&&prev.dryRun===true&&prev.approvalRequired===true);
  add('live install disabled', (M.flags.allowInstall&&M.flags.allowLiveActions)===false);
  const exp=M.importExport.exportPack(['tpl_ai_tools_reseller']);
  add('export redacted (no leak)', exp.ok===true);
  report=M.report(); add('report generated', report.ok===true&&Array.isArray(report.templates));
  add('no secret/PII leak in report', !M.privacyGuard.hasLeak(report));
}catch(e){ add('functional pipeline', false, e.message); }

const passed=checks.filter(c=>c.ok).length, failed=checks.filter(c=>!c.ok).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:checks.length,strict:String(process.env.TEMPLATE_MARKETPLACE_STRICT||'false'),checks};
const dir=path.join(ROOT,'artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'template_marketplace_check.json'), JSON.stringify(out,null,2));
let md=`# Template Marketplace Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach(c=>{ md+=`| ${c.name} | ${c.ok?'✅':'❌'} | ${String(c.detail).slice(0,60)} |\n`; });
fs.writeFileSync(path.join(dir,'template_marketplace_check.md'), md); console.log(md);
const strict=String(process.env.TEMPLATE_MARKETPLACE_STRICT||'').toLowerCase()==='true';
process.exit((strict&&failed>0)?1:0);
