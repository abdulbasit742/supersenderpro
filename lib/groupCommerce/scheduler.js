// lib/groupCommerce/scheduler.js - Scheduled Catalog Broadcast Planner
const catalog = require('./catalog');

const LIVE_RELAY = process.env.GROUP_COMMERCE_LIVE_RELAY === 'true';

// Plan a recurring catalog broadcast. Returns a draft schedule plan (dry-run).
function planScheduledBroadcast(groupId, options = {}) {
  const frequency = options.frequency || 'daily'; // daily | hourly | weekly
  const timeOfDay = options.timeOfDay || '09:00';
  const target = options.target || 'group'; // group | channel | social

  const postText = target === 'group'
    ? catalog.generateWhatsAppGroupCatalogPost(groupId)
    : catalog.generateChannelOrSocialCatalogPost(groupId);

  // Compute a human readable cron-like descriptor
  let cron = '0 9 * * *';
  if (frequency === 'hourly') cron = '0 * * * *';
  else if (frequency === 'weekly') cron = '0 9 * * 1';
  else if (frequency === 'daily') {
    const hh = parseInt(String(timeOfDay).split(':')[0], 10) || 9;
    const mm = parseInt(String(timeOfDay).split(':')[1], 10) || 0;
    cron = mm + ' ' + hh + ' * * *';
  }

  return {
    success: true,
    dryRun: !LIVE_RELAY,
    groupId,
    schedule: { frequency, timeOfDay, target, cron },
    draftPost: postText,
    note: LIVE_RELAY
      ? 'Live relay enabled - broadcast will be dispatched on schedule.'
      : 'Dry-run mode - this is a draft plan only. No live broadcast scheduled.'
  };
}

module.exports = { planScheduledBroadcast };
