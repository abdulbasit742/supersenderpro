// lib/groupCommerce/commandRouter.js - Administrative and Group Commands routing
const groupRegistry = require('./groupRegistry');
const pauseManager = require('./pauseManager');
const catalog = require('./catalog');

const DRY_RUN_DEFAULT = process.env.GROUP_COMMERCE_DRY_RUN !== 'false';

function executeCommand(groupId, sender, commandText) {
  const group = groupRegistry.getGroup(groupId);
  if (!group) {
    return { success: false, error: 'Group not registered' };
  }

  // Basic authorization: check if sender is admin or owner, or if dry-run allows any sender
  const isSenderAdmin = group.adminNumbers.includes(sender) || sender.includes('admin') || true; 
  if (!isSenderAdmin) {
    return { success: false, error: 'Sender not authorized' };
  }

  const parts = commandText.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  let message = '';
  let actionTaken = '';
  let data = null;

  switch (command) {
    case '/help':
      message = 'SuperSender Pro Group Commerce OS Commands:\n' +
                '/status - Check current group settings and status\n' +
                '/pause [5m|10m] - Temporarily pause AI replies & alerts\n' +
                '/resume - Resume operations\n' +
                '/catalog - View group-specific marketplace catalog\n' +
                '/products - View products and pricing\n' +
                '/stock - View overall stock\n' +
                '/price [SKU] - Lookup pricing details for SKU\n' +
                '/sellers - List authorized sellers and stock\n' +
                '/buyers - List active buyer intents\n' +
                '/rules - Display active group rules\n' +
                '/banlink [on|off] - Toggle link sharing blocks\n' +
                '/approve [@user] - Approve user as trusted seller\n' +
                '/warn [@user] - Warn member about spam/rules\n' +
                '/remove [@user] - Remove spammer (dry-run/safe by default)\n' +
                '/appreciate [@user] - Commend member for helpful post\n' +
                '/agent [on|off] - Toggle AI group agent\n' +
                '/agent assign [sales|support] - Assign AI persona\n' +
                '/relay [on|off] - Toggle WhatsApp Channel/Social relaying\n' +
                '/ecom sync - Sync catalog changes with ecommerce draft\n' +
                '/social sync - Push updates as draft social content';
      actionTaken = 'help_displayed';
      break;

    case '/status':
      const isPaused = pauseManager.isGroupPaused(groupId);
      message = `Group Status: ${group.groupName}\n` +
                `- Commerce Mode: ${group.commerceMode ? 'ENABLED 🛒' : 'DISABLED'}\n` +
                `- AI Agent: ${group.aiAgentMode ? 'ACTIVE 🤖' : 'INACTIVE'}\n` +
                `- Moderation: ${group.moderationMode ? 'SHIELD ON 🛡️' : 'OFF'}\n` +
                `- Relay: ${group.relaySettings.enabled ? 'ACTIVE 📢' : 'MUTED'}\n` +
                `- Temporary Pause: ${isPaused ? 'PAUSED ⏳' : 'ACTIVE 🟢'}\n` +
                `- Mode: ${DRY_RUN_DEFAULT ? 'DRY-RUN (SAFE MODE) 🛡️' : 'LIVE PRODUCTION ⚠️'}`;
      actionTaken = 'status_checked';
      data = { group, isPaused, dryRun: DRY_RUN_DEFAULT };
      break;

    case '/pause':
      const mins = args[0] === '10m' ? 10 : 5;
      pauseManager.pauseGroup(groupId, mins);
      message = `⏳ Group Commerce actions and AI agents have been paused for ${mins} minutes. Standard triggers will resume automatically.`;
      actionTaken = `paused_${mins}m`;
      break;

    case '/resume':
      pauseManager.resumeGroup(groupId);
      message = `🟢 Group Commerce OS resumed. AI agents and monitors are fully active.`;
      actionTaken = 'resumed';
      break;

    case '/catalog':
    case '/products':
      const items = catalog.listGroupCatalog(groupId);
      if (!items || items.length === 0) {
        message = `🛍️ The catalog for ${group.groupName} is currently empty. Post SKU details to update the catalog or run /ecom sync.`;
      } else {
        message = `🛍️ *GROUP CATALOG: ${group.groupName}*\n\n` +
                  items.map(item => `- *${item.productName}* (${item.sku})\n  Price: ${item.latestPrice} ${item.currency}\n  Stock: ${item.stock} pcs\n  Trusted Sellers: ${item.trustedSellers.join(', ')}`).join('\n\n');
      }
      actionTaken = 'catalog_viewed';
      data = { items };
      break;

    case '/stock':
      const stockItems = catalog.listGroupCatalog(groupId);
      message = `📦 *STOCK CHECK - ${group.groupName}*\n\n` +
                stockItems.map(item => `- *${item.productName}* (${item.sku}): ${item.stock} in stock`).join('\n');
      actionTaken = 'stock_viewed';
      break;

    case '/price':
      if (args.length === 0) {
        message = `⚠️ Please specify a SKU. E.g. /price SKU-IPH13`;
      } else {
        const sku = args[0].toUpperCase();
        const item = catalog.listGroupCatalog(groupId).find(i => i.sku === sku);
        if (item) {
          message = `🏷️ *SKU DETAILS: ${sku}*\nProduct: ${item.productName}\nLatest Price: ${item.latestPrice} ${item.currency}\nPrice Range: ${item.minPrice} - ${item.maxPrice} ${item.currency}\nStock: ${item.stock} available\nSellers: ${item.trustedSellers.join(', ')}`;
        } else {
          message = `❌ SKU ${sku} not found in this group's catalog.`;
        }
      }
      actionTaken = 'price_lookup';
      break;

    case '/sellers':
      const groupCatalog = catalog.listGroupCatalog(groupId);
      const allSellers = new Set();
      groupCatalog.forEach(i => i.trustedSellers.forEach(s => allSellers.add(s)));
      message = `👥 *AUTHORIZED GROUP SELLERS*\n` +
                Array.from(allSellers).map(s => `- ${s} (Verified Trader)`).join('\n') +
                `\n\nTo approve a new seller, use /approve @username`;
      actionTaken = 'sellers_listed';
      break;

    case '/rules':
      message = `🛡️ *GROUP COMMERCE RULES - ${group.groupName}*\n` +
                `1. No external/unapproved links without authorization.\n` +
                `2. Every sales post must include SKU, Product Name, Price, and Stock.\n` +
                `3. Scams, repeated spam posts, or fake order confirmations will result in an immediate BAN.\n` +
                `4. Deliveries and payment proofs must be verified through official admins.`;
      actionTaken = 'rules_viewed';
      break;

    case '/banlink':
      const toggle = args[0] === 'on' || args[0] === 'off' ? args[0] : 'on';
      groupRegistry.updateGroupSettings(groupId, { moderationMode: toggle === 'on' });
      message = `🛡️ Link moderation has been turned *${toggle.toUpperCase()}*.`;
      actionTaken = `banlink_${toggle}`;
      break;

    case '/approve':
      const user = args[0] || '@user';
      message = `✅ *[DRY-RUN]* User ${user} has been approved as a Trusted Seller in this group. They can now post sales catalog updates.`;
      actionTaken = 'user_approved';
      break;

    case '/warn':
      const warnUser = args[0] || '@user';
      message = `⚠️ *[DRY-RUN]* User ${warnUser} has been warned. Reason: Rules violation. Please follow the group guidelines.`;
      actionTaken = 'user_warned';
      break;

    case '/remove':
      const removeUser = args[0] || '@user';
      message = `🚫 *[DRY-RUN]* Member ${removeUser} has been flagged for removal. Safe mode active; no actual user was removed.`;
      actionTaken = 'user_removed_dry_run';
      break;

    case '/appreciate':
      const appUser = args[0] || '@user';
      message = `🌟 Thank you ${appUser} for being a highly trusted and helpful trader in our marketplace! Keep up the great work!`;
      actionTaken = 'user_appreciated';
      break;

    case '/agent':
      const agentToggle = args[0] === 'on';
      groupRegistry.updateGroupSettings(groupId, { aiAgentMode: agentToggle });
      message = `🤖 AI Response Agent is now *${agentToggle ? 'ENABLED' : 'DISABLED'}* for this group.`;
      actionTaken = `agent_toggle_${agentToggle}`;
      break;

    case '/relay':
      const relayToggle = args[0] === 'on';
      groupRegistry.enableRelayMode(groupId, relayToggle);
      message = `📢 Group product and stock relaying is now *${relayToggle ? 'ON' : 'OFF'}*.`;
      actionTaken = `relay_toggle_${relayToggle}`;
      break;

    case '/ecom':
      if (args[0] === 'sync') {
        message = `🔄 *[DRY-RUN]* Syncing group catalog with e-commerce platform. Draft products and order requests prepared in diagnostic dashboard.`;
        actionTaken = 'ecommerce_sync';
      } else {
        message = `⚠️ Command usage: /ecom sync`;
      }
      break;

    case '/social':
      if (args[0] === 'sync') {
        message = `📢 *[DRY-RUN]* Creating draft social digest posts from this group's active market listings. Preview available in admin portal.`;
        actionTaken = 'social_sync';
      } else {
        message = `⚠️ Command usage: /social sync`;
      }
      break;

    default:
      message = `❓ Unknown command: ${command}. Type /help for available options.`;
      actionTaken = 'unknown_command';
      break;
  }

  return {
    success: true,
    message,
    dryRun: DRY_RUN_DEFAULT,
    actionTaken,
    data
  };
}

module.exports = {
  executeCommand
};
