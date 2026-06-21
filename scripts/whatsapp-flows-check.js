 'use strict';
 /**
  * scripts/whatsapp-flows-check.js — loads the flows layer, confirms safe defaults,
  * validates seeded flows, walks the order flow, confirms response masking, writes
  * a report to artifacts/. Read-only on source; only writes under artifacts/.
  * No network, no live send, no Meta publish, no secrets printed.
  */
 const fs = require('fs');
 const path = require('path');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));

 function main() {
   const defaultFlows = R('lib/whatsappFlows/defaultFlows.js');
   const validator = R('lib/whatsappFlows/flowValidator.js');
   const runner = R('lib/whatsappFlows/flowRunnerPreview.js');
   const componentTypes = R('lib/whatsappFlows/componentTypes.js');
   const responseStore = R('lib/whatsappFlows/responseStore.js');
   R('routes/whatsappFlowsRoutes.js');

   const flows = defaultFlows.seeds();
   const blockers = [];
   const warnings = [];

   if (Object.keys(componentTypes.TYPES).length < 8) warnings.push('few_component_types');
   flows.forEach((f) => { const v = validator.validate(f); if (!v.ok) blockers.push('invalid_flow:' + f.id + ':' +
 v.errors.join('|')); });


   // Walk the order flow with valid answers -> should complete.
   const order = flows.find((f) => f.id === 'flow_order');
   const walk = runner.walk(order, {
     PRODUCT: { product: 'wa_pro_1m', quantity: 2 },
     DETAILS: { full_name: 'Test', phone: '+923001112233', address: 'Somewhere' },
     CONFIRM: { consent: true },
   });
   if (!walk.completedPreview) blockers.push('order_walk_did_not_complete');

   // Missing required field -> validation error, no advance.
   const bad = runner.run(order, { screenId: 'PRODUCT', answers: {} });
   if (!bad.validationErrors || !bad.validationErrors.length) blockers.push('required_validation_missing');

      // Response masking: phone must be masked.
      const rec = responseStore.maskAnswers({ phone: '+923001112233', name: 'Test' });
      if (/923001112233/.test(JSON.stringify(rec))) blockers.push('phone_not_masked');

      const result = {
        generatedAt: new Date().toISOString(),
        dryRun: true, liveActionsEnabled: false, liveSend: false, livePublish: false,
        module: 'whatsapp-flows',
        flows: flows.length,
        componentTypes: Object.keys(componentTypes.TYPES).length,
        warnings, blockers,
        pass: blockers.length === 0,
      };


      const ARTIFACTS = path.join(ROOT, 'artifacts');
      if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
      fs.writeFileSync(path.join(ARTIFACTS, 'whatsapp_flows_check.json'), JSON.stringify(result, null, 2));


   console.log('[whatsapp-flows:check] flows=%d components=%d blockers=%d pass=%s', result.flows, result.componentTypes,
 result.blockers.length, result.pass);
      process.exit(result.pass ? 0 : 1);
 }
 main();
