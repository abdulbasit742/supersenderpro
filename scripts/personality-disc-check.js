'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const R = (p) => require(path.join(ROOT, p));

function main() {
  const blockers = [];
  const warnings = [];

  const analyzer = R('lib/personalityDisc/discAnalyzer.js');
  const store = R('lib/personalityDisc/store.js');
  R('routes/personalityRoutes.js');

  const result = analyzer.analyzeClientPersonality({
    clientId: 'check_client',
    messages: [
      'How much is this plan?',
      'I need exact price and warranty details.',
      'Please share the steps before I decide.',
    ],
  });

  if (!result.primaryType) blockers.push('missing_primary_type');
  if (!result.normalizedScores || typeof result.normalizedScores.C !== 'number') blockers.push('missing_scores');
  if (result.messageCount !== 3) blockers.push('message_count_wrong');

  const parsed = analyzer.parseWhatsAppChat('16/06/2026, 10:30 - Ali: How much?\n16/06/2026, 10:31 - Ali: Send exact details.', 'Ali');
  if (parsed.length !== 2) blockers.push('chat_parse_failed');

  const draft = analyzer.buildTailoredReplyDraft({ profile: result, offer: 'ChatGPT Plus', customerMessage: 'price?' });
  if (draft.liveSend !== false) blockers.push('draft_live_send_not_false');
  if (draft.dryRun !== true) blockers.push('draft_dry_run_not_true');

  const stats = store.getStats();
  if (typeof stats.profileCount !== 'number') blockers.push('store_stats_invalid');

  const report = {
    generatedAt: new Date().toISOString(),
    module: 'personality-disc',
    dryRun: true,
    liveActionsEnabled: false,
    warnings,
    blockers,
    pass: blockers.length === 0,
  };

  const artifacts = path.join(ROOT, 'artifacts');
  if (!fs.existsSync(artifacts)) fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(path.join(artifacts, 'personality_disc_check.json'), JSON.stringify(report, null, 2));
  console.log('[personality-disc:check] blockers=%d pass=%s', blockers.length, report.pass);
  process.exit(report.pass ? 0 : 1);
}

main();
