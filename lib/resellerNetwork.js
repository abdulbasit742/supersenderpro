const fs = require('fs'), path = require('path');
const RESELLERS_FILE = path.join(__dirname, '../data/resellers.json');
function load(f, fb) { try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : fb; } catch { return fb; } }
function save(f, d) { fs.writeFileSync(f, JSON.stringify(d, null, 2)); }

function registerReseller(phone, name) {
  const data = load(RESELLERS_FILE, { resellers: [] });
  const existing = data.resellers.find(r => r.phone === phone);
  if (existing) return { success: false, reseller: existing };
  
  const reseller = {
    id: `RES-${Date.now()}`,
    phone,
    name,
    tier: 'standard',
    discount: 0.15, // 15% discount for reseller pricing
    status: 'active',
    joinedAt: new Date().toISOString()
  };
  
  data.resellers.push(reseller);
  save(RESELLERS_FILE, data);
  return { success: true, reseller };
}

function getReseller(phone) {
  const data = load(RESELLERS_FILE, { resellers: [] });
  return data.resellers.find(r => r.phone === phone) || null;
}

module.exports = { registerReseller, getReseller };
