// lib/automationRules/config.js — Safe config for the Automation Rules Engine.
// JSON-backed like the rest of the app. This is the orchestration layer: it reacts to events and
// invokes OTHER departments to take actions. It performs NO direct sends itself; every action is
// delegated to a department that is already draft/advisory-safe. Actions can be globally paused.
// Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.AUTOMATION_RULES_ENABLED, true),
 // Master switch: when true, actions are COMPUTED + logged but NOT executed (dry-run the whole engine).
 dryRun: bool(process.env.AUTOMATION_RULES_DRY_RUN, false),
 // Default throttle window (minutes) per rule+discriminator to avoid action storms.
 defaultThrottleMinutes: num(process.env.AUTOMATION_RULES_THROTTLE_MINUTES, 5),
 // Max actions a single rule may run per event (guards against misconfiguration).
 maxActionsPerRule: num(process.env.AUTOMATION_RULES_MAX_ACTIONS, 10),
 maxRunLog: num(process.env.AUTOMATION_RULES_MAX_RUN_LOG, 5000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.AUTOMATION_RULES_STORE_PATH, 'data/automation-rules.json'),
 },
};

// Event names rules can listen for (open set; these are the documented/known ones).
const KNOWN_EVENTS = ['message.received', 'message.sent', 'payment.succeeded', 'ticket.created', 'ticket.resolved', 'sla.breach', 'contact.created', 'survey.response', 'nps.detractor', 'nps.promoter', 'link.clicked', 'opt_in', 'opt_out', 'campaign.completed', 'custom'];
// Action types the pipeline can run (each delegates to another department).
const ACTION_TYPES = ['add_tag', 'set_consent', 'enroll_drip', 'assign_agent', 'raise_alert', 'track_event', 'send_template', 'schedule_message', 'webhook_emit'];

module.exports = { config, bool, num, ROOT, DATA_DIR, KNOWN_EVENTS, ACTION_TYPES };
