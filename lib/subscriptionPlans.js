const fs = require('fs'), path = require('path');
const PLANS_FILE = path.join(__dirname, '../data/subscription_plans.json');
function load(f, fb) { try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : fb; } catch { return fb; } }
function save(f, d) { fs.writeFileSync(f, JSON.stringify(d, null, 2)); }

const DEFAULT_PLANS = {
  starter: { price: 0, limit: 100, features: ['basic_whatsapp'] },
  pro: { price: 2000, limit: 5000, features: ['basic_whatsapp', 'ai_replies', 'auto_post'] },
  unlimited: { price: 5000, limit: -1, features: ['basic_whatsapp', 'ai_replies', 'auto_post', 'custom_agents'] }
};

function getPlans() {
  return load(PLANS_FILE, DEFAULT_PLANS);
}

function getUserSubscription(phone) {
  const data = load(PLANS_FILE, { users: {} });
  return data.users?.[phone] || { tier: 'starter', expiresAt: null, active: true };
}

function subscribeUser(phone, tier, durationDays = 30) {
  const data = load(PLANS_FILE, { users: {} });
  if (!data.users) data.users = {};
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  
  data.users[phone] = {
    tier,
    expiresAt: expiresAt.toISOString(),
    active: true
  };
  save(PLANS_FILE, data);
  return data.users[phone];
}

module.exports = { getPlans, getUserSubscription, subscribeUser };
