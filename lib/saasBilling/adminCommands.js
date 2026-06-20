// lib/saasBilling/adminCommands.js — Admin WhatsApp command handlers for billing.
// INTEGRATION POINT: if an existing admin command router exists, register these hooks
// (do NOT create a duplicate bot). Replies are concise Urdu/English mixed text strings.
// Handlers are read-only/draft — they never charge, send live, or suspend.

const billingStatus = require('./billingStatus');
const tenantPlans = require('./tenantPlans');
const usageMeter = require('./usageMeter');
const invoiceStore = require('./invoiceStore');
const renewalEngine = require('./renewalEngine');
const planChange = require('./planChange');
const resellerManager = require('./resellerManager');
const doctor = require('./doctor');

function money(n, cur = 'PKR') { return `${cur} ${Number(n || 0).toLocaleString()}`; }

const COMMANDS = {
  '!billingstatus': () => {
    const o = billingStatus.overview().cards;
    return `📊 Billing Status\nActive: ${o.activeTenants} | Trials: ${o.trials} | Past due: ${o.pastDue}\nInvoices due: ${o.invoicesDue} | Revenue draft: ${money(o.monthlyRevenueDraft)}\nUsage warnings: ${o.usageWarnings}`;
  },
  '!tenantplan': (tid) => {
    const s = billingStatus.tenantStatus(tid || 'default');
    return `🏷️ Tenant ${s.tenantId}\nPlan: ${s.planName} | License: ${s.licenseStatus}\nExpiry: ${s.expiresAt || '—'}`;
  },
  '!tenantusage': (tid) => {
    const u = usageMeter.getUsage(tid || 'default', 'monthly');
    const top = Object.entries(u.totals).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', ') || 'koi usage nahi';
    return `📈 Usage (${u.tenantId}, monthly)\n${top}`;
  },
  '!invoice': (tid) => {
    const list = invoiceStore.forTenant(tid || 'default').slice(-3);
    if (!list.length) return `🧾 ${tid || 'default'} ke liye koi invoice nahi.`;
    return `🧾 Invoices (${tid || 'default'})\n` + list.map((i) => `${i.invoiceNumber} · ${money(i.amount, i.currency)} · ${i.status}`).join('\n');
  },
  '!pastdue': () => {
    const e = renewalEngine.scan();
    const all = [...e.pastDue, ...e.inGrace];
    return all.length ? `⚠️ Past due / grace (${all.length}):\n` + all.map((l) => `${l.tenantId} · ${l.status}`).join('\n') : '✅ Koi past due tenant nahi.';
  },
  '!trials': () => {
    const e = renewalEngine.scan();
    return e.trialsEnding.length ? `⏳ Trials ending (${e.trialsEnding.length}):\n` + e.trialsEnding.map((l) => `${l.tenantId} · ${l.trialEndsAt}`).join('\n') : '✅ Koi trial jald khatam nahi ho raha.';
  },
  '!upgradepreview': (tid, plan) => {
    try { const p = planChange.preview({ tenantId: tid || 'default', toPlanId: plan }); return `🔼 Upgrade preview\n${p.from} → ${p.to} (${p.direction})\nApproval required: haan | Dry-run: ${p.dryRun}`; }
    catch (e) { return `❌ ${e.message}`; }
  },
  '!billingdoctor': () => { const d = doctor.run(); return `🩺 Billing Doctor\nScore: ${d.score}/100 (${d.status})\nBlockers: ${d.blockers.length} | Warnings: ${d.warnings.length}`; },
  '!resellerstatus': () => { const r = resellerManager.listResellers(); return `🤝 Resellers: ${r.resellers.length} (legacy: ${r.legacyResellerCount})`; },
  '!commissions': () => {
    const rep = resellerManager.commissionReport();
    const unpaid = rep.reduce((s, r) => s + (r.unpaidAmount || 0), 0);
    return `💰 Commissions\nResellers: ${rep.length} | Unpaid total: ${money(unpaid)}`;
  },
};

// Parse + handle a raw admin message. Returns a reply string or null if not a billing command.
function handle(rawText) {
  const text = String(rawText || '').trim();
  const [cmd, ...args] = text.split(/\s+/);
  const fn = COMMANDS[cmd && cmd.toLowerCase()];
  if (!fn) return null;
  try { return fn(...args); } catch (e) { return `❌ Error: ${e.message}`; }
}

// Register with an existing admin command system if one is provided.
function register(adminRouter) {
  if (!adminRouter || typeof adminRouter.on !== 'function') return { registered: false, reason: 'no compatible admin router; use handle() as integration point' };
  Object.keys(COMMANDS).forEach((cmd) => adminRouter.on(cmd, (msg) => handle(msg.text || cmd)));
  return { registered: true, commands: Object.keys(COMMANDS) };
}

module.exports = { COMMANDS: Object.keys(COMMANDS), handle, register };
