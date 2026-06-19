const fs = require('fs'), path = require('path'), crypto = require('crypto');
const REF_FILE = path.join(__dirname, '../data/referrals.json');
function load(f, fb) { try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : fb; } catch { return fb; } }
function save(f, d) { fs.writeFileSync(f, JSON.stringify(d, null, 2)); }

function createReferral(phone, referrerCode = null) {
  const data = load(REF_FILE, { referrals: [] });
  const existing = data.referrals.find(r => r.phone === phone);
  if (existing) return { success: false, referral: existing };
  
  const code = 'REF' + crypto.createHash('md5').update(phone).digest('hex').substring(0, 6).toUpperCase();
  const ref = {
    id: `REF-${Date.now()}`,
    phone,
    code,
    referrerCode,
    status: 'pending',
    rewardEarned: 0,
    createdAt: new Date().toISOString()
  };
  
  data.referrals.push(ref);
  save(REF_FILE, data);
  return { success: true, referral: ref };
}

function completeReferral(phone) {
  const data = load(REF_FILE, { referrals: [] });
  const ref = data.referrals.find(r => r.phone === phone && r.status === 'pending');
  if (!ref) return null;
  
  ref.status = 'completed';
  ref.rewardEarned = 100; // Default flat reward points
  save(REF_FILE, data);
  return ref;
}

module.exports = { createReferral, completeReferral };
