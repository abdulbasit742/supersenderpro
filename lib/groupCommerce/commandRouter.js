// lib/groupCommerce/commandRouter.js
// Group Commerce OS - parses & routes group admin commands. Admin-gated.
// Always returns what WOULD happen; never performs destructive live actions
// unless GROUP_COMMERCE_LIVE_GROUP_ACTIONS=true (and not dry-run).
'use strict';

const registry = require('./groupRegistry');
const pause = require('./pauseManager');
const catalog = require('./catalog');
const agents = require('./agentRegistry');

const CONFIG = {
  liveGroupActions: String(process.env.GROUP_COMMERCE_LIVE_GROUP_ACTIONS || 'false') === 'true',
  dryRun: String(process.env.GROUP_COMMERCE_DRY_RUN || 'true') === 'true',
};

function live() { return CONFIG.liveGroupActions && !CONFIG.dryRun; }

function parse(text) {
  const s = String(text || '').trim();
  if (!s.startsWith('/')) return null;
  const [cmd, ...rest] = s.split(/\s+/);
  return { cmd: cmd.toLowerCase(), args: rest };
}

// ctx: { groupId, fromNumber } - fromNumber used for admin verification.
function route(text, ctx) {
  const parsed = parse(text);
  if (!parsed) return { ok: false, error: 'not a command' };
  const { cmd, args } = parsed;
  const g = registry.get(ctx.groupId);
  if (!g) return { ok: false, error: 'group not registered' };

  // Admin verification (hashed). Unverifiable -> dry-run warning only.
  const isAdmin = registry.isAdmin(ctx.groupId, ctx.fromNumber);
  if (!isAdmin) return { ok: true, dryRun: true, warning: 'admin identity not verified; command not executed', cmd };
  if (g.allowedCommands && !g.allowedCommands.includes(cmd)) return { ok: false, error: `command not allowed: ${cmd}` };

  switch (cmd) {
    case '/help': return reply(`Commands: ${(g.allowedCommands || []).join(' ')}`);
    case '/status': return reply(`commerce=${g.commerceMode} ai=${g.aiAgentMode} relay=${g.relaySettings.enabled}\nmoderation=${g.moderationMode}`);
    case '/pause': {
      const m = (args[0] || '').match(/(\d+)/);
      return wrap(pause.pause(ctx.groupId, m ? Number(m[1]) : undefined, ['ai']));
    }
    case '/resume': return wrap(pause.resume(ctx.groupId));
    case '/catalog': return wrap(catalog.groupPostDraft(ctx.groupId));
    case '/products': {
      const c = catalog.listCatalog(ctx.groupId);
      return reply(`${Object.keys(c.items || {}).length} products in catalogue`);
    }
    case '/stock': {
      const c = catalog.listCatalog(ctx.groupId);
      const inStock = Object.values(c.items || {}).filter((i) => i.stockStatus === 'in_stock').length;
      return reply(`${inStock} items in stock`);
    }
    case '/price': {
      const sku = (args[0] || '').toLowerCase();
      const c = catalog.listCatalog(ctx.groupId);
      const it = c.items[sku];
      return reply(it ? `${it.productName}: ${it.currency} ${it.latestPrice}` : `no item for ${sku}`);
    }
    case '/sellers': return reply('seller list (from catalogue offers)');
    case '/buyers': return reply('recent buyer requests');
    case '/orders': return reply('order drafts (preview only)');
    case '/rules': return reply('Group rules: no spam, SKU+price required for offers, no scam payments.');
    case '/banlink': {
      const on = args[0] === 'on';
      registry.update(ctx.groupId, { moderationMode: on ? 'enforce' : 'monitor' });
      return reply(`banlink ${on ? 'on' : 'off'} (moderation ${on ? 'enforce dry-run' : 'monitor'})`);
    }
    case '/approve': return guardedUserAction('approve', args[0]);
    case '/warn': return guardedUserAction('warn', args[0]);
    case '/remove': return guardedUserAction('remove', args[0]);
    case '/appreciate': return reply(`would appreciate ${mask(args[0])}`);
    case '/agent': return handleAgent(ctx.groupId, args);
    case '/relay': {
      const on = args[0] === 'on';
      registry.setRelayMode(ctx.groupId, on);
      return reply(`relay ${on ? 'on' : 'off'} (drafts only unless GROUP_COMMERCE_LIVE_RELAY=true)`);
    }
    case '/ecom': return reply(args[0] === 'sync' ? 'ecommerce sync preview generated (no live writes)' : 'usage: /ecom sync');
    case '/social': return reply(args[0] === 'sync' ? 'social post draft generated (no live post)' : 'usage: /social sync');
    default: return { ok: false, error: `unknown command: ${cmd}` };
  }

  function handleAgent(groupId, a) {
    if (a[0] === 'on') { registry.setAgentMode(groupId, true); return reply('AI agent mode ON (suggest-only)'); }
    if (a[0] === 'off') { registry.setAgentMode(groupId, false); return reply('AI agent mode OFF'); }
    if (a[0] === 'assign' && a[1]) {
      const r = agents.setAssignment(groupId, a[1], true);
      return reply(r.ok ? `assigned agent: ${a[1]}` : r.error);
    }
    return reply('usage: /agent on|off|assign <name>');
  }

  function guardedUserAction(kind, who) {
    if (kind === 'remove' && !live()) {
      return { ok: true, dryRun: true, wouldDo: `WOULD ${kind} ${mask(who)} (dry-run; set GROUP_COMMERCE_LIVE_GROUP_ACTIONS=true to enable)` };
    }
    if (!live()) return { ok: true, dryRun: true, wouldDo: `WOULD ${kind} ${mask(who)}` };
    return { ok: true, performed: `${kind} ${mask(who)}`, note: 'live group action (requires real WhatsApp group admin support)' };
  }

  function reply(msg) { return { ok: true, cmd, dryRun: CONFIG.dryRun, reply: msg }; }
  function wrap(r) { return Object.assign({ ok: true, cmd, dryRun: CONFIG.dryRun }, r); }
  function mask(n) { return registry.maskNumber(String(n || '').replace(/^@/, '')); }
}

module.exports = { route, parse, CONFIG };
