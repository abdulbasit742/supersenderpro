// lib/campaignIntelligence/index.js — aggregator: status, summary, architecture.
  'use strict';
  const cfg = require('./config');
  const { detect, loadCampaigns } = require('./moduleAdapters');
  const { deriveFunnel, deriveFinance, rate } = require('./campaignModel');
  const { optOutRisk } = require('./optOutRiskPreview');
  const { broadcastHealthScore } = require('./broadcastHealthScore');
  const { recommendations } = require('./recommendationEngine');


  const SUPPORTED_MODULES = [
    'campaign_status', 'campaign_registry', 'performance_summary', 'delivery_analytics', 'read_reply_analytics',
    'conversion_analytics', 'funnel_analytics', 'revenue_attribution', 'roi_calculator', 'segment_performance',
    'audience_quality', 'template_performance', 'template_quality_risk', 'broadcast_health', 'opt_out_risk',
    'rate_limit_risk', 'fatigue_detector', 'send_time_optimization', 'ab_test_design', 'ab_test_result',
    'winning_variant', 'copy_performance', 'cta_performance', 'lifecycle_analytics', 'cohort_retention',
    'reengagement', 'anomaly_detector', 'campaign_ranking', 'recommendation_engine', 'audit_preview', 'log_preview',
  'dashboard_ui',
  ];


  function getCampaignIntelligenceStatus() {
    const det = detect();

     return cfg.base({ campaignIntelligenceEnabled: true, supportedModules: SUPPORTED_MODULES, warnings: det.warnings,
 blockers: [] });
 }


 function getCampaignIntelligenceSummary() {
     const camps = loadCampaigns();
     const list = camps.length ? camps : [{ id: 'demo1' }, { id: 'demo2' }, { id: 'demo3' }];
     let recipients = 0, delivered = 0, read = 0, replied = 0, conversions = 0, revenue = 0, cost = 0;
     list.forEach((c) => { const f = deriveFunnel(c); const fin = deriveFinance(c, f); recipients += f.targetedPreview;
 delivered += f.deliveredPreview; read += f.readPreview; replied += f.repliedPreview; conversions += f.convertedPreview;
 revenue += fin.revenuePreview; cost += fin.costPreview; });
     const roi = cost > 0 ? Number((((revenue - cost) / cost) * 100).toFixed(1)) : 0;
     const bh = broadcastHealthScore();
     return cfg.base({
       totalCampaignsPreview: list.length, activeCampaignsPreview: camps.filter((c) =>
 /active|live|running/i.test(String(c.status || ''))).length,
     totalRecipientsPreview: recipients, deliveredPreview: delivered, readPreview: read, repliedPreview: replied,
       conversionsPreview: conversions, revenueAttributedPreview: revenue, averageRoiPreview: roi,
       optOutRiskPreview: optOutRisk().optOutRiskPreview, campaignHealthPreview: bh.gradePreview,
       recommendationsPreview: recommendations().recommendationsPreview.slice(0, 5),
     });
 }


 function getArchitecturePreview() {
   const det = detect();
     const integrations = Object.keys(det.adapters).filter((k) => det.adapters[k].availablePreview);
     return cfg.base({
       architecturePreview: {
         backend: (cfg.exists('server.js') || cfg.exists('app.js')) ? 'express_detected_preview' : 'unknown_preview',
         dashboard: cfg.exists('public') ? 'static_public_detected_preview' : 'unknown_preview',
         campaigns: det.adapters.campaigns.availablePreview ? 'detected_preview' : 'not_detected_preview',
       whatsapp: det.adapters.whatsapp.availablePreview || det.adapters.whatsappCloud.availablePreview ?
 'detected_preview' : 'not_detected_preview',
         dataset: loadCampaigns().length ? 'campaign_data_detected_preview' : 'synthetic_preview',
         integrations,
       },
     });
 }


 module.exports = { getCampaignIntelligenceStatus, getCampaignIntelligenceSummary, getArchitecturePreview,
 SUPPORTED_MODULES };
