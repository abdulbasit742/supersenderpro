const fs = require('fs'), path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/marketing_campaigns.json');
function load() { try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { campaigns: [] }; } catch { return { campaigns: [] }; } }
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function createCampaign(storeId, name, templateText) {
  const data = load();
  const camp = {
    id: `CAMP-${Date.now()}`,
    storeId,
    name,
    templateText,
    status: 'draft',
    sentCount: 0,
    createdAt: new Date().toISOString()
  };
  data.campaigns.push(camp);
  save(data);
  return camp;
}

module.exports = { createCampaign };
