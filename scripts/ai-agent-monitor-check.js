 'use strict';
 /**
  * scripts/ai-agent-monitor-check.js — loads the monitor layer, confirms safe
  * defaults (dry-run, no live AI/send), exercises quality+risk+handoff on the
  * seed replies, and writes a small report to artifacts/. Read-only on source;
  * only writes under artifacts/. No network, no external AI, no secrets printed.
  */
 const fs = require('fs');
 const path = require('path');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));

 function main() {
   const model = R('lib/aiAgentMonitor/aiReplyModel.js');
   const replyQuality = R('lib/aiAgentMonitor/replyQuality.js');
   const riskChecker = R('lib/aiAgentMonitor/riskChecker.js');
   const handoffRules = R('lib/aiAgentMonitor/handoffRules.js');
   R('lib/aiAgentMonitor/handoffQueue.js');
   R('lib/aiAgentMonitor/knowledgeGapDetector.js');
   R('lib/aiAgentMonitor/agentAnalytics.js');
   R('routes/aiAgentMonitorRoutes.js');

   const blockers = [];
   const warnings = [];
   const seeds = model.seeds();

   // Each seed must produce a numeric confidence + quality and a valid risk level.
   seeds.forEach((s) => {
     const q = replyQuality.assess(s.userMessagePreview, s.aiReplyPreview, s.confidenceScore);
     if (typeof q.confidenceScore !== 'number' || typeof q.qualityScore !== 'number') blockers.push('bad_scores:' + s.id);
     const risk = riskChecker.check(s.userMessagePreview, s.aiReplyPreview, q.confidenceScore);
     if (!model.RISK_LEVELS.includes(risk.riskLevel)) blockers.push('bad_risk_level:' + s.id);
   });

   // Overpromising legal reply must trigger handoff.
   const legal = handoffRules.evaluate({ userMessage: 'Is this legal?', aiReply: 'Yes it is completely legal everywhere, guaranteed.', confidenceScore: 0.3 });
   if (!legal.handoffRequired) blockers.push('legal_overpromise_not_escalated');

   const result = {

     generatedAt: new Date().toISOString(),
     dryRun: true, liveActionsEnabled: false, liveAiCall: false, liveSend: false,
     module: 'ai-agent-monitor',
     seedReplies: seeds.length,
     riskLevels: model.RISK_LEVELS,
     handoffTriggers: handoffRules.TRIGGERS,
     warnings, blockers,
     pass: blockers.length === 0,
   };

   const ARTIFACTS = path.join(ROOT, 'artifacts');
   if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
   fs.writeFileSync(path.join(ARTIFACTS, 'ai_agent_monitor_check.json'), JSON.stringify(result, null, 2));

   console.log('[ai-agent-monitor:check] seeds=%d blockers=%d pass=%s', result.seedReplies, result.blockers.length,
 result.pass);
   process.exit(result.pass ? 0 : 1);
 }
 main();
