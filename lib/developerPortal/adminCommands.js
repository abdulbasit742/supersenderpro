// developerPortal/adminCommands.js — admin chat command handlers (concise, no secrets/full URLs).
// Integration point: wire these into the existing admin command router. Never returns API keys or full webhook URLs.
const registry = require('./developerRegistry');
const events = require('./webhookEventCatalog');
const subs = require('./webhookSubscriptions');
const { policy } = require('./safetyGuard');

function handle(cmd, arg){
  const c = String(cmd||'').toLowerCase();
  if (c==='!devapps'){
    const apps = registry.listApps();
    return `🧩 Developer Apps: ${apps.length}\n` + apps.slice(0,8).map(a=>`• ${a.name} [${a.appType}] — ${a.status}`).join('\n') || 'Koi app nahi.';
  }
  if (c==='!webhooks'){
    const s = subs.listSubs();
    return `🔗 Webhook Subscriptions: ${s.length} (sab dry-run/preview)\n` + s.slice(0,8).map(x=>`• ${x.urlMasked} → ${x.eventTypes.length} events [${x.deliveryMode}]`).join('\n');
  }
  if (c==='!events'){
    const e = events.eventTypes();
    return `📡 Available Events: ${e.length}\n` + e.slice(0,12).join(', ') + (e.length>12?' …':'');
  }
  if (c==='!webhooktest'){
    return arg ? `🧪 Dry-run test queued for ${arg} (no live call). Dekho delivery logs.` : 'Usage: !webhooktest [subscriptionId]';
  }
  if (c==='!devdoctor'){
    const p = policy();
    return `🩺 Dev Portal: enabled=${p.enabled}, dryRun=${p.dryRun}, liveWebhooks=${p.allowLiveWebhooks}, realKeys=${p.allowRealKeys}. Safe defaults ON.`;
  }
  if (c==='!apidocs'){
    return '📚 API docs: GET /api/developer-portal/api-catalog aur /api/developer-portal/openapi.json se milti hain.';
  }
  return null;
}
module.exports = { handle, COMMANDS:['!devapps','!webhooks','!events','!webhooktest','!devdoctor','!apidocs'] };
