const fs = require('fs'), path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/marketing_analytics.json');
function load() { try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { events: [] }; } catch { return { events: [] }; } }
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function logMarketingEvent(campaignId, eventType, phone) {
  const data = load();
  const ev = {
    id: `EV-${Date.now()}`,
    campaignId,
    eventType, // 'sent', 'delivered', 'read', 'click'
    phone,
    timestamp: new Date().toISOString()
  };
  data.events.push(ev);
  save(data);
  return ev;
}

module.exports = { logMarketingEvent };
