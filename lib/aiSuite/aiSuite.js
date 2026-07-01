// lib/aiSuite/aiSuite.js
// ────────────────────────────────────────────────────────────────────
// AI Suite registry + mounter. Across this project we shipped a self-hosted-AI
// suite (support agent, RAG, voice in/out, vision, translation, intent routing,
// lead intel, copywriter, send-time, cart recovery, win-back, reviews, upsell,
// segments, broadcast analyzer, booking, customer 360, guardrails, LLM ops,
// analytics copilot, owner briefing, and the inbound pipeline that ties them).
//
// Each feature is self-mountable, which is great for incremental rollout but
// means ~25 app.use lines. This module is the convenience layer:
//   - REGISTRY: every feature\'s mount path + router module + health module
//   - mountAll(app): mount every INSTALLED feature in one call (best-effort)
//   - aggregateHealth(): fan out to each feature\'s health() for a single status
//
// Everything is best-effort: a missing feature file is simply skipped, so this
// works no matter which subset of PRs has been merged. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

function tryRequire(p) { try { return require(p); } catch { return null; } }

// id, label, mount path, router module path, and an optional health module path.
const REGISTRY = [
  { id: 'support-agent',      label: 'Conversational Support Agent', path: '/api/support-agent',     router: '../../routes/supportAgentRoutes',     health: '../../ai/agents/supportAgent' },
  { id: 'knowledge-base',     label: 'RAG Knowledge Base',          path: '/api/knowledge-base',     router: '../../routes/knowledgeBaseRoutes',    health: '../../ai/knowledgeBase/ragStore' },
  { id: 'media-studio',       label: 'AI Media Studio',             path: '/api/media-studio',       router: '../../routes/mediaStudioRoutes',      health: '../mediaStudio/mediaStudio' },
  { id: 'voice-note',         label: 'Voice-Note AI (STT)',         path: '/api/voice-note',         router: '../../routes/voiceNoteRoutes',        health: '../voiceNoteAI/voiceNoteAI' },
  { id: 'voice-reply',        label: 'Voice Replies (TTS)',         path: '/api/voice-reply',        router: '../../routes/voiceReplyRoutes',       health: '../voiceReply/voiceReply' },
  { id: 'vision-search',      label: 'Image Product Search',        path: '/api/vision-search',      router: '../../routes/visionSearchRoutes',     health: '../visionSearch/visionSearch' },
  { id: 'translation',        label: 'Real-Time Translation',       path: '/api/translation',        router: '../../routes/translationRoutes',      health: '../translation/translator' },
  { id: 'intent-router',      label: 'Intent Router + Tagging',     path: '/api/intent-router',      router: '../../routes/intentRouterRoutes',     health: '../intentRouter/intentRouter' },
  { id: 'lead-intel',         label: 'Lead Intelligence',           path: '/api/lead-intel',         router: '../../routes/leadIntelRoutes',        health: '../leadIntel/leadIntel' },
  { id: 'campaign-copy',      label: 'Campaign Copywriter',         path: '/api/campaign-copy',      router: '../../routes/campaignCopyRoutes',     health: '../campaignCopy/campaignCopy' },
  { id: 'send-time',          label: 'Smart Send-Time',             path: '/api/send-time',          router: '../../routes/sendTimeRoutes',         health: '../sendTime/sendTimeOptimizer' },
  { id: 'cart-recovery',      label: 'Cart Recovery',               path: '/api/cart-recovery',      router: '../../routes/cartRecoveryRoutes',     health: '../cartRecovery/cartRecovery' },
  { id: 'winback',            label: 'Dormant Win-Back',            path: '/api/winback',            router: '../../routes/winbackRoutes',          health: '../winback/winback' },
  { id: 'reviews',            label: 'Review Collector',            path: '/api/reviews',            router: '../../routes/reviewRoutes',           health: '../reviews/reviewCollector' },
  { id: 'upsell',             label: 'Upsell Recommender',          path: '/api/upsell',             router: '../../routes/upsellRoutes',           health: '../upsell/upsellEngine' },
  { id: 'segments',           label: 'NL Segment Builder',          path: '/api/segments',           router: '../../routes/segmentRoutes',          health: '../segments/segmentBuilder' },
  { id: 'broadcast-analyzer', label: 'Broadcast Analyzer',          path: '/api/broadcast-analyzer', router: '../../routes/broadcastAnalyzerRoutes', health: '../broadcastAnalyzer/broadcastAnalyzer' },
  { id: 'booking',            label: 'Appointment Booking',         path: '/api/booking',            router: '../../routes/bookingRoutes',          health: '../booking/bookingEngine' },
  { id: 'customer-360',       label: 'Customer 360',                path: '/api/customer-360',       router: '../../routes/customer360Routes',      health: '../customer360/customer360' },
  { id: 'guardrails',         label: 'Safety Guardrails',           path: '/api/guardrails',         router: '../../routes/guardrailsRoutes',       health: '../guardrails/guardrails' },
  { id: 'llm-ops',            label: 'Local LLM Ops',               path: '/api/llm-ops',            router: '../../routes/llmOpsRoutes',           health: '../llmOps/llmOps' },
  { id: 'analytics-copilot',  label: 'Analytics Copilot',           path: '/api/analytics-copilot',  router: '../../routes/analyticsCopilotRoutes', health: '../analyticsCopilot/analyticsCopilot' },
  { id: 'ai-briefing',        label: 'Daily Owner Briefing',        path: '/api/ai-briefing',        router: '../../routes/ownerBriefingRoutes',    health: '../ownerBriefing/dailyBriefing' },
  { id: 'faq-trainer',        label: 'Self-Improving FAQ Trainer',  path: '/api/faq-trainer',        router: '../../routes/faqTrainerRoutes',       health: '../faqTrainer/faqTrainer' },
  { id: 'order-extraction',   label: 'Order Extraction',            path: '/api/order-extraction',   router: '../../routes/orderExtractionRoutes',  health: '../orderExtraction/orderExtractor' },
  { id: 'inbound',            label: 'Inbound Pipeline (capstone)', path: '/api/inbound',            router: '../../routes/inboundPipelineRoutes',  health: '../inboundPipeline/inboundPipeline' }
];

/**
 * Mount every installed feature router onto an Express app in one call.
 * Returns { mounted:[{id,path}], skipped:[{id,reason}] }. Best-effort: a feature
 * whose router file isn\'t present (PR not merged) is skipped, not fatal.
 */
function mountAll(app, { prefix = '' } = {}) {
  const mounted = [], skipped = [];
  for (const f of REGISTRY) {
    const router = tryRequire(f.router);
    if (!router) { skipped.push({ id: f.id, reason: 'router not installed' }); continue; }
    try { app.use(prefix + f.path, router); mounted.push({ id: f.id, path: prefix + f.path }); }
    catch (e) { skipped.push({ id: f.id, reason: e.message }); }
  }
  return { mounted, skipped };
}

/**
 * Aggregate health across the suite. Calls each feature\'s health() when it
 * exposes one (sync or async). Never throws; failures are captured per-feature.
 * @returns {Promise<{ generatedAt, total, up, features:[{id,label,path,installed,ok,detail}] }>}
 */
async function aggregateHealth() {
  const features = [];
  for (const f of REGISTRY) {
    const mod = tryRequire(f.health);
    const routerInstalled = Boolean(tryRequire(f.router));
    if (!mod) { features.push({ id: f.id, label: f.label, path: f.path, installed: routerInstalled, ok: false, detail: routerInstalled ? 'no health module' : 'not installed' }); continue; }
    let detail = null, ok = true;
    try {
      if (typeof mod.health === 'function') { const h = await mod.health(); detail = h; ok = h && (h.ok !== false); }
      else { detail = 'loaded'; ok = true; }
    } catch (e) { ok = false; detail = { error: e.message }; }
    features.push({ id: f.id, label: f.label, path: f.path, installed: routerInstalled, ok, detail });
  }
  const up = features.filter(x => x.installed && x.ok).length;
  return { generatedAt: new Date().toISOString(), total: REGISTRY.length, installed: features.filter(x => x.installed).length, up, features };
}

function listFeatures() { return REGISTRY.map(({ id, label, path }) => ({ id, label, path })); }

module.exports = { REGISTRY, mountAll, aggregateHealth, listFeatures };
