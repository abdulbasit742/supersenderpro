'use strict';
const fs = require('fs'); const path = require('path');
const readiness = require('./demoReadinessScoring'); const checklist = require('./demoAcceptanceChecklist');
function generate() { const r=readiness.run(); const c=checklist.run(); const report={ generatedAt:new Date().toISOString(), readiness:r, checklist:c, dryRun:true, liveActionsEnabled:false }; try{ const dir=path.join(process.cwd(),'artifacts'); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'guided_demo_report.json'), JSON.stringify(report,null,2)); fs.writeFileSync(path.join(dir,'guided_demo_report.md'), '# Guided Demo - Delivery Report\n\nGenerated: '+report.generatedAt+'\nReadiness: '+r.score+'\n'); }catch(e){} return report; }
module.exports = { generate };
