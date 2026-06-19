const fs = require('fs');
const path = require('path');

const RULES_FILE = path.join(__dirname, '../data/channel_rules.json');
const FWD_FILE = path.join(__dirname, '../data/forwarded_ids.json');
const LOGS_FILE = path.join(__dirname, '../data/channel_logs.json');

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('Failed reading JSON', file, e);
    return fallback;
  }
}

const rules = loadJson(RULES_FILE, {});
const forwarded = loadJson(FWD_FILE, {});
const logs = loadJson(LOGS_FILE, []);

/**
 * Forward a message to target channels based on channel_rules.json.
 * @param {Object} msg - Incoming message object (must contain `channelId` and `messageId`).
 */
function forwardMessage(msg) {
  const src = msg.channelId;
  if (!rules[src]) return; // no forwarding rule

  const targets = rules[src]; // array of target channel IDs
  targets.forEach(targetId => {
    // prevent duplicate forwarding
    const key = `${msg.messageId}-${targetId}`;
    if (forwarded[key]) return;
    // Here you would integrate with your messaging SDK / API to actually forward.
    // For now we just log the intention.
    console.log(`Forwarding message ${msg.messageId} from ${src} to ${targetId}`);
    forwarded[key] = true;
    logs.push({
      messageId: msg.messageId,
      from: src,
      to: targetId,
      timestamp: new Date().toISOString()
    });
  });

  // persist state
  fs.writeFileSync(FWD_FILE, JSON.stringify(forwarded, null, 2));
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

module.exports = { forwardMessage };
