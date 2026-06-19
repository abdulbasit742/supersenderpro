// loyaltyProgram.js — Customer Loyalty & Rewards Wallet (Shopify/Smile.io style retention engine).
// Customers earn points on every verified order, climb loyalty tiers, and redeem points for
// rewards (discounts, free months, gifts). Integrates with storeCRM so every earn/redeem is
// logged as an interaction and the points balance lives on the customer profile.

const fs = require('fs');
const path = require('path');
const storeCRM = require('./storeCRM');

const CRM_DIR = path.join(__dirname, '../data/store_crm');
if (!fs.existsSync(CRM_DIR)) fs.mkdirSync(CRM_DIR, { recursive: true });

const txFile = (storeId) => path.join(CRM_DIR, `${storeId}_loyalty.json`);

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// Points earned per Rs spent (1 point per Rs 100)
const POINTS_PER_RUPEE = 0.01;

const LOYALTY_TIERS = [
  { tier: 'Platinum', label: '💎 Platinum', min: 5000, perks: ['15% off all orders', 'Priority support', '1 free month yearly'] },
  { tier: 'Gold',     label: '🥇 Gold',     min: 2000, perks: ['10% off all orders', 'Early access to new tools'] },
  { tier: 'Silver',   label: '🥈 Silver',   min: 500,  perks: ['5% off all orders'] },
  { tier: 'Member',   label: '⭐ Member',   min: 0,    perks: ['Earn 1 point per Rs 100 spent'] }
];

function tierForPoints(points) {
  return LOYALTY_TIERS.find(t => points >= t.min) || LOYALTY_TIERS[LOYALTY_TIERS.length - 1];
}

class LoyaltyProgram {
  constructor(sendDirect) {
    this.sendDirect = sendDirect;
  }

  _load(storeId) { return readJSON(txFile(storeId), { wallets: {} }); }
  _save(storeId, data) { writeJSON(txFile(storeId), data); }

  getBalance(storeId, phone) {
    const data = this._load(storeId);
    const w = data.wallets[phone] || { points: 0, lifetimePoints: 0, transactions: [] };
    const tier = tierForPoints(w.lifetimePoints);
    return {
      phone,
      points: w.points,
      lifetimePoints: w.lifetimePoints,
      tier: tier.tier,
      tierLabel: tier.label,
      perks: tier.perks,
      transactionCount: (w.transactions || []).length
    };
  }

  /**
   * Earn points. Pass either amountSpent (auto-calculates) or explicit points.
   */
  earnPoints(storeId, phone, { amountSpent = 0, points = 0, reason = 'Order reward' } = {}) {
    const data = this._load(storeId);
    const w = data.wallets[phone] || { points: 0, lifetimePoints: 0, transactions: [] };

    const earned = points || Math.round(amountSpent * POINTS_PER_RUPEE);
    if (earned <= 0) return this.getBalance(storeId, phone);

    w.points += earned;
    w.lifetimePoints += earned;
    w.transactions = w.transactions || [];
    w.transactions.unshift({ type: 'earn', points: earned, reason, ts: new Date().toISOString() });
    if (w.transactions.length > 200) w.transactions = w.transactions.slice(0, 200);
    data.wallets[phone] = w;
    this._save(storeId, data);

    const tier = tierForPoints(w.lifetimePoints);
    // Mirror onto CRM profile
    storeCRM.upsertCustomer(storeId, phone, { loyaltyPoints: w.points, loyaltyTier: tier.tier });
    storeCRM.addInteraction(storeId, phone, { type: 'loyalty_earn', details: `Earned ${earned} pts (${reason}). Balance: ${w.points}` });

    if (this.sendDirect) {
      this.sendDirect(phone, `🎁 You earned *${earned} loyalty points*! Your balance is now *${w.points} pts* (${tier.label}). Redeem anytime for exclusive discounts. 🛍️`, { source: 'Loyalty' })
        .catch(() => {});
    }
    return this.getBalance(storeId, phone);
  }

  /**
   * Redeem points for a reward.
   */
  redeemPoints(storeId, phone, pointsToRedeem, rewardName = 'Reward') {
    const data = this._load(storeId);
    const w = data.wallets[phone];
    if (!w || w.points < pointsToRedeem) {
      throw new Error('Insufficient points balance');
    }
    w.points -= pointsToRedeem;
    w.transactions.unshift({ type: 'redeem', points: -pointsToRedeem, reason: rewardName, ts: new Date().toISOString() });
    data.wallets[phone] = w;
    this._save(storeId, data);

    storeCRM.upsertCustomer(storeId, phone, { loyaltyPoints: w.points });
    storeCRM.addInteraction(storeId, phone, { type: 'loyalty_redeem', details: `Redeemed ${pointsToRedeem} pts for "${rewardName}". Balance: ${w.points}` });

    if (this.sendDirect) {
      this.sendDirect(phone, `✅ You redeemed *${pointsToRedeem} pts* for *${rewardName}*! Remaining balance: *${w.points} pts*. Thank you for your loyalty. 🙌`, { source: 'Loyalty' })
        .catch(() => {});
    }
    return this.getBalance(storeId, phone);
  }

  getTransactions(storeId, phone, limit = 50) {
    const data = this._load(storeId);
    const w = data.wallets[phone] || { transactions: [] };
    return (w.transactions || []).slice(0, limit);
  }

  getLeaderboard(storeId, limit = 20) {
    const data = this._load(storeId);
    return Object.entries(data.wallets)
      .map(([phone, w]) => ({ phone, points: w.points, lifetimePoints: w.lifetimePoints, tier: tierForPoints(w.lifetimePoints).tier }))
      .sort((a, b) => b.lifetimePoints - a.lifetimePoints)
      .slice(0, limit);
  }

  getTiers() { return LOYALTY_TIERS; }
}

module.exports = LoyaltyProgram;
