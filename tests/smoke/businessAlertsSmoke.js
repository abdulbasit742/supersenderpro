  'use strict';

  const fs = require('fs');
  const path = require('path');
  process.env.BUSINESS_ALERTS_PATH = 'data/.ba-smoke.json';
  process.env.BUSINESS_ALERTS_RULES_PATH = 'data/.ba-smoke-rules.json';

  const store = require('../../lib/businessAlerts/store');
  const detector = require('../../lib/businessAlerts/anomalyDetector');
  const evaluator = require('../../lib/businessAlerts/ruleEvaluator');
  const ruleModel = require('../../lib/businessAlerts/anomalyRuleModel');
  const priority = require('../../lib/businessAlerts/alertPriority');
  const notifications = require('../../lib/businessAlerts/notificationDrafts');
  const digest = require('../../lib/businessAlerts/alertDigest');
  const recommend = require('../../lib/businessAlerts/actionRecommendation');
  const routes = require('../../routes/businessAlertsRoutes');


  const results = [];
  const t = (name, cond) => results.push({ name, pass: Boolean(cond) });


  const d = detector.detect();
  t('detect dry-run', d.dryRun === true && d.liveActionsEnabled === false);
  t('detect scanned modules', Array.isArray(d.scannedModulesPreview));
  t('sample triggers alerts', d.detectedAlertsPreview.length > 0);
  t('revenue drop detected', d.detectedAlertsPreview.some((a) => a.signalKey === 'revenue_change_pct'));
  t('profit negative critical', d.detectedAlertsPreview.some((a) => a.signalKey === 'net_profit' && a.severity ===
  'critical'));


  t('eval gt', evaluator.evaluate(ruleModel.build({ condition: 'gt', threshold: 10 }), 15).matched === true);
  t('eval lt', evaluator.evaluate(ruleModel.build({ condition: 'lt', threshold: 0 }), -1).matched === true);
  t('eval rise_pct', evaluator.evaluate(ruleModel.build({ condition: 'rise_pct', threshold: 30 }), 35).matched === true);

  const alerts = store.readAlerts();
  t('alerts persisted', alerts.length > 0);
  const sorted = priority.sort(alerts);
  t('priority sort critical-first', sorted.length < 2 || priority.RANK[sorted[0].severity] >=
  priority.RANK[sorted[sorted.length-1].severity]);


  const nd = notifications.build(alerts[0].id, 'whatsapp_preview', '+92 300 1234567');
  t('notification draft no live send', nd.ok === true && nd.liveSend === false);
  t('notification recipient masked', !/3001234567/.test(JSON.stringify(nd)));


  const dg = digest.digest('weekly');
  t('digest dry-run', dg.dryRun === true && dg.period === 'weekly');
  t('digest headline', typeof dg.headline === 'string' && dg.headline.length > 0);

  const reco = recommend.topRecommendations(sorted);


  t('recommendations built', Array.isArray(reco) && reco.length > 0);
  t('routes module loads', !!routes);

  const passed = results.filter((r) => r.pass).length;
  const allPass = passed === results.length;
  try { const dir = path.resolve(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); fs.writeFileSync(path.join(dir, 'business_alerts_smoke.json'), JSON.stringify({ passed, total: results.length,
  allPass, results }, null, 2)); } catch (_e) {}
  console.log(`Business Alerts smoke: ${passed}/${results.length}`);
  results.filter((r) => !r.pass).forEach((r) => console.log(' ✗ ' + r.name));
  ['data/.ba-smoke.json','data/.ba-smoke-rules.json'].forEach((f) => { try { fs.rmSync(path.resolve(process.cwd(), f), {
  force: true }); } catch (_e) {} });
  process.exit(allPass ? 0 : 1);
