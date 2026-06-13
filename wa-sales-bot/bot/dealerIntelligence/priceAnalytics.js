const { db } = require('../../db/database');
const trustManager = require('./trustManager');

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function summarizeRateRows(rows = []) {
  if (!rows.length) return null;
  const prices = rows.map(row => asNumber(row.buy_price)).filter(value => value > 0);
  if (!prices.length) return null;
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const average = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  const bestRow = rows.find(row => asNumber(row.buy_price) === lowest) || rows[0];
  const trusted = bestRow?.dealer_code ? trustManager.getTrustedDealerByCode(bestRow.dealer_code) : null;
  return {
    lowest,
    highest,
    average: Number(average.toFixed(2)),
    spread_pct: lowest > 0 ? Number((((highest - lowest) / lowest) * 100).toFixed(2)) : 0,
    best_dealer: {
      dealer_code: bestRow?.dealer_code || trusted?.dealer_code || '',
      dealer_name: trusted?.dealer_name || bestRow?.dealer_name || bestRow?.dealer_number || 'Unverified',
      dealer_number: bestRow?.dealer_number || '',
      timestamp: bestRow?.created_at || bestRow?.parsed_at || ''
    }
  };
}

function getRateRows(toolSlug = '', planSlug = '', hours = 24) {
  return db.prepare(`
    SELECT *
    FROM dealer_rates
    WHERE tool_slug = ?
      AND (? = '' OR LOWER(COALESCE(plan_slug, '')) = LOWER(?))
      AND created_at >= datetime('now', ?)
      AND trust_status != 'scammer'
    ORDER BY created_at DESC
  `).all(toolSlug, planSlug || '', planSlug || '', `-${Number(hours || 24)} hours`);
}

function getLowestPrice(toolSlug, planSlug) {
  const summary = summarizeRateRows(getRateRows(toolSlug, planSlug, 24));
  if (!summary) return null;
  return {
    price: summary.lowest,
    dealer_code: summary.best_dealer.dealer_code,
    dealer_name: summary.best_dealer.dealer_name,
    timestamp: summary.best_dealer.timestamp
  };
}

function getHighestPrice(toolSlug, planSlug) {
  const rows = getRateRows(toolSlug, planSlug, 24);
  if (!rows.length) return null;
  const highest = Math.max(...rows.map(row => asNumber(row.buy_price)));
  const row = rows.find(item => asNumber(item.buy_price) === highest) || rows[0];
  return {
    price: highest,
    dealer_code: row.dealer_code || '',
    dealer_name: row.dealer_name || row.dealer_number || 'Unknown',
    timestamp: row.created_at || row.parsed_at || ''
  };
}

function getAveragePrice(toolSlug, planSlug, days = 7) {
  const rows = db.prepare(`
    SELECT buy_price
    FROM dealer_rates
    WHERE tool_slug = ?
      AND (? = '' OR LOWER(COALESCE(plan_slug, '')) = LOWER(?))
      AND created_at >= datetime('now', ?)
      AND trust_status != 'scammer'
  `).all(toolSlug, planSlug || '', planSlug || '', `-${Number(days || 7)} days`);
  if (!rows.length) return 0;
  const average = rows.reduce((sum, row) => sum + asNumber(row.buy_price), 0) / rows.length;
  return Number(average.toFixed(2));
}

function getPriceSpread(toolSlug, planSlug = '') {
  const summary = summarizeRateRows(getRateRows(toolSlug, planSlug, 24));
  if (!summary) return null;
  return {
    lowest: summary.lowest,
    highest: summary.highest,
    average: summary.average,
    spread_pct: summary.spread_pct,
    best_dealer: summary.best_dealer
  };
}

function getDailyPriceSummary() {
  const rows = db.prepare(`
    SELECT tool_slug, COALESCE(plan_slug, '') AS plan_slug, plan_name
    FROM dealer_rates
    WHERE created_at >= datetime('now', '-24 hours')
      AND trust_status != 'scammer'
    GROUP BY tool_slug, COALESCE(plan_slug, ''), plan_name
    ORDER BY tool_slug ASC, plan_name ASC
  `).all();
  return rows.map(row => ({
    tool_slug: row.tool_slug,
    plan_slug: row.plan_slug,
    plan_name: row.plan_name,
    ...getPriceSpread(row.tool_slug, row.plan_slug)
  })).filter(Boolean);
}

function getBestDealerByTool(toolSlug) {
  const rows = db.prepare(`
    SELECT dealer_number, dealer_name, dealer_code,
           COUNT(*) AS entries_count,
           AVG(buy_price) AS avg_price,
           MIN(buy_price) AS lowest_price
    FROM dealer_rates
    WHERE tool_slug = ?
      AND created_at >= datetime('now', '-30 days')
      AND trust_status IN ('trusted', 'manual_trusted')
    GROUP BY dealer_number, dealer_name, dealer_code
    ORDER BY lowest_price ASC, avg_price ASC, entries_count DESC
    LIMIT 1
  `).all(toolSlug);
  return rows[0] || null;
}

function getBestDealer(toolSlug = '') {
  return getBestDealerByTool(toolSlug);
}

function getPriceTrend(toolSlug, days = 30) {
  return db.prepare(`
    SELECT date(created_at, 'localtime') AS day,
           AVG(buy_price) AS average_price,
           MIN(buy_price) AS lowest_price,
           MAX(buy_price) AS highest_price
    FROM dealer_rates
    WHERE tool_slug = ?
      AND created_at >= datetime('now', ?)
      AND trust_status != 'scammer'
    GROUP BY date(created_at, 'localtime')
    ORDER BY day ASC
  `).all(toolSlug, `-${Number(days || 30)} days`).map(row => ({
    day: row.day,
    average_price: Number(Number(row.average_price || 0).toFixed(2)),
    lowest_price: asNumber(row.lowest_price),
    highest_price: asNumber(row.highest_price)
  }));
}

function snapshotDailyPriceHistory() {
  const summary = getDailyPriceSummary();
  const upsert = db.prepare(`
    INSERT INTO price_history (
      tool_slug, plan_slug, summary_date, lowest_price, highest_price, average_price,
      best_dealer_code, best_dealer_name, spread_pct, created_at
    )
    VALUES (?, ?, date('now', 'localtime'), ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tool_slug, plan_slug, summary_date) DO UPDATE SET
      lowest_price = excluded.lowest_price,
      highest_price = excluded.highest_price,
      average_price = excluded.average_price,
      best_dealer_code = excluded.best_dealer_code,
      best_dealer_name = excluded.best_dealer_name,
      spread_pct = excluded.spread_pct,
      created_at = excluded.created_at
  `);
  summary.forEach(item => {
    upsert.run(
      item.tool_slug,
      item.plan_slug || '',
      asNumber(item.lowest),
      asNumber(item.highest),
      asNumber(item.average),
      item.best_dealer?.dealer_code || '',
      item.best_dealer?.dealer_name || '',
      asNumber(item.spread_pct)
    );
  });
  return summary.length;
}

function buildDailyPriceReport() {
  const summary = getDailyPriceSummary();
  if (!summary.length) {
    return '📊 *Daily Price Intelligence*\n━━━━━━━━━━━━━━━━━\nAbhi last 24h mein koi dealer rates collect nahi hui.';
  }

  let bestProfit = null;
  const blocks = summary.map(item => {
    const spread = getPriceSpread(item.tool_slug, item.plan_slug || '') || item;
    const planTitle = `${item.tool_slug.charAt(0).toUpperCase()}${item.tool_slug.slice(1)} ${item.plan_name}`.trim();
    const sellBase = db.prepare(`
      SELECT p.sell_price
      FROM plans p
      JOIN tools t ON t.id = p.tool_id
      WHERE t.slug = ? AND LOWER(p.plan_slug) = LOWER(?)
      LIMIT 1
    `).get(item.tool_slug, item.plan_slug || '') || {};
    const sellPrice = asNumber(sellBase.sell_price);
    const profit = sellPrice > 0 ? sellPrice - asNumber(spread.lowest) : 0;
    const profitPct = spread.lowest > 0 ? Number(((profit / spread.lowest) * 100).toFixed(2)) : 0;
    if (!bestProfit || profit > bestProfit.profit) {
      bestProfit = {
        label: planTitle,
        buy: asNumber(spread.lowest),
        sell: sellPrice,
        profit,
        pct: profitPct
      };
    }
    return `🤖 *${planTitle}*\n` +
      `   Lowest: Rs ${asNumber(spread.lowest).toLocaleString('en-PK')} (${spread.best_dealer?.dealer_code || 'Unverified'} ${spread.best_dealer?.dealer_name || ''})\n` +
      `   Average: Rs ${asNumber(spread.average).toLocaleString('en-PK')}\n` +
      `   Highest: Rs ${asNumber(spread.highest).toLocaleString('en-PK')}\n` +
      `   Best buy from: ${spread.best_dealer?.dealer_code || 'Unverified'} (${spread.best_dealer?.dealer_name || 'Unknown'})`;
  });

  const footer = bestProfit
    ? `\n━━━━━━━━━━━━━━━━━\n💡 Best profit today: ${bestProfit.label}\n   Buy: Rs ${bestProfit.buy.toLocaleString('en-PK')} | Sell: Rs ${bestProfit.sell.toLocaleString('en-PK')}\n   Profit: Rs ${bestProfit.profit.toLocaleString('en-PK')} (${bestProfit.pct}%)`
    : '';

  return `📊 *Daily Price Intelligence*\n━━━━━━━━━━━━━━━━━\n${blocks.join('\n\n')}${footer}`;
}

function getDailyReport() {
  return buildDailyPriceReport();
}

module.exports = {
  getLowestPrice,
  getHighestPrice,
  getAveragePrice,
  getBestDealer,
  getPriceSpread,
  getDailyPriceSummary,
  getBestDealerByTool,
  getPriceTrend,
  snapshotDailyPriceHistory,
  buildDailyPriceReport,
  getDailyReport
};
