// lib/groupCommerce/leaderboard.js - Seller Trust & Activity Leaderboard
const catalog = require('./catalog');
const store = require('./store');

function buildLeaderboard(groupId) {
  const items = catalog.listGroupCatalog(groupId);
  const sellerStats = {};

  items.forEach(item => {
    (item.trustedSellers || []).forEach(seller => {
      const masked = store.maskPhoneNumber(seller);
      if (!sellerStats[masked]) {
        sellerStats[masked] = {
          seller: masked,
          listings: 0,
          totalStock: 0,
          skus: [],
          trustScore: 50
        };
      }
      sellerStats[masked].listings += 1;
      sellerStats[masked].totalStock += (item.stock || 0);
      sellerStats[masked].skus.push(item.sku);
    });
  });

  const leaderboard = Object.values(sellerStats).map(s => {
    // Simple trust score: base 50 + listings weight + stock availability weight
    s.trustScore = Math.min(50 + s.listings * 10 + Math.min(s.totalStock, 50) / 2, 100);
    s.trustScore = Math.round(s.trustScore);
    s.rank = 0;
    return s;
  });

  leaderboard.sort((a, b) => b.trustScore - a.trustScore);
  leaderboard.forEach((s, idx) => { s.rank = idx + 1; });

  return { success: true, groupId, sellerCount: leaderboard.length, leaderboard };
}

module.exports = { buildLeaderboard };
