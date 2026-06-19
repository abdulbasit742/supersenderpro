const fs = require('fs'), path = require('path'), crypto = require('crypto');
const AFF_FILE = path.join(__dirname, '../data/affiliates.json');
const COMM_FILE = path.join(__dirname, '../data/affiliate_commissions.json');
function load(f, fb) { try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : fb; } catch { return fb; } }
function save(f, d) { fs.writeFileSync(f, JSON.stringify(d, null, 2)); }
const RATES = { starter: 0.08, silver: 0.10, gold: 0.12, platinum: 0.15 };
function genCode(phone) { return 'REF' + crypto.createHash('md5').update(phone).digest('hex').substring(0, 6).toUpperCase(); }
function registerAffiliate(phone, name) {
  const data = load(AFF_FILE, { affiliates: [] });
  const existing = data.affiliates.find(a => a.phone === phone);
  if (existing) return { success: false, affiliate: existing };
  const aff = { id: `AFF-${Date.now()}`, phone, name: name || phone, refCode: genCode(phone), tier: 'starter', status: 'active', totalReferrals: 0, totalEarned: 0, pendingPayout: 0, paidOut: 0, joinedAt: new Date().toISOString() };
  data.affiliates.push(aff); save(AFF_FILE, data);
  return { success: true, affiliate: aff };
}
function recordReferralSale(refCode, orderAmount, orderId) {
  const data = load(AFF_FILE, { affiliates: [] });
  const aff = data.affiliates.find(a => a.refCode === refCode && a.status === 'active');
  if (!aff) return null;
  const commission = Math.round(orderAmount * (RATES[aff.tier] || 0.08));
  aff.totalReferrals++; aff.totalEarned += commission; aff.pendingPayout += commission;
  if (aff.totalEarned >= 50000) aff.tier = 'platinum';
  else if (aff.totalEarned >= 20000) aff.tier = 'gold';
  else if (aff.totalEarned >= 5000) aff.tier = 'silver';
  save(AFF_FILE, data);
  const comms = load(COMM_FILE, { commissions: [] });
  comms.commissions.push({ affiliatePhone: aff.phone, refCode, orderId, orderAmount, commission, status: 'pending', createdAt: new Date().toISOString() });
  save(COMM_FILE, comms);
  return { affiliate: aff, commission };
}
function payoutAffiliate(phone, amount) {
  const data = load(AFF_FILE, { affiliates: [] });
  const aff = data.affiliates.find(a => a.phone === phone);
  if (!aff || aff.pendingPayout < amount) return { success: false, reason: 'Insufficient balance' };
  aff.pendingPayout -= amount; aff.paidOut += amount; save(AFF_FILE, data);
  return { success: true, paid: amount };
}
function getAffiliate(phone) { return load(AFF_FILE, { affiliates: [] }).affiliates.find(a => a.phone === phone) || null; }
function getAffiliateByCode(code) { return load(AFF_FILE, { affiliates: [] }).affiliates.find(a => a.refCode === code) || null; }
function getAllAffiliates() { return load(AFF_FILE, { affiliates: [] }).affiliates.sort((a, b) => b.totalEarned - a.totalEarned); }
module.exports = { registerAffiliate, recordReferralSale, payoutAffiliate, getAffiliate, getAffiliateByCode, getAllAffiliates, RATES, genCode };
