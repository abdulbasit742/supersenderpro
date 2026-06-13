const { db } = require('../../db/database');
const trustManager = require('./trustManager');
const stockManager = require('./stockManager');
const priceAnalytics = require('./priceAnalytics');

function safeJsonArray(value) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAllTrustedDealers() {
  return trustManager.listTopTrustedDealers(500).map(row => {
    const profile = trustManager.getDealerTrustProfile(row.dealer_code);
    return {
      dealer_code: row.dealer_code,
      name: row.dealer_name,
      whatsapp_number: row.dealer_number,
      tools_available: profile?.tools_list || [],
      avg_price_per_tool: profile?.avg_price_per_tool || {},
      lowest_price_ever: profile?.lowest_price_ever || {},
      highest_price_ever: profile?.highest_price_ever || {},
      trust_score: Number(row.trust_score || 0),
      total_orders_placed: Number(row.orders_completed || 0),
      reliability_rate: Number(Math.min(100, Math.max(0, row.trust_score || 0))).toFixed(2),
      last_active: row.last_active,
      response_time_avg: Number(row.response_time_avg || 0),
      notes: row.notes || '',
      tags: safeJsonArray(row.tags)
    };
  });
}

function getDealerProfile(code = '') {
  const profile = trustManager.getDealerTrustProfile(code);
  if (!profile) return null;
  return {
    dealer_code: profile.dealer_code,
    name: profile.dealer_name,
    whatsapp_number: profile.dealer_number,
    tools_available: profile.tools_list || [],
    avg_price_per_tool: profile.avg_price_per_tool || {},
    lowest_price_ever: profile.lowest_price_ever || {},
    highest_price_ever: profile.highest_price_ever || {},
    trust_score: Number(profile.trust_score || 0),
    total_orders_placed: Number(profile.orders_completed || 0),
    reliability_rate: Number(Math.min(100, Math.max(0, profile.trust_score || 0))).toFixed(2),
    last_active: profile.last_active,
    response_time_avg: Number(profile.response_time_avg || 0),
    notes: profile.notes || '',
    tags: safeJsonArray(profile.tags)
  };
}

function getDealerRates(code = '') {
  const profile = trustManager.getTrustedDealerByCode(code);
  if (!profile) return [];
  return db.prepare(`
    SELECT *
    FROM dealer_rates
    WHERE dealer_number = ?
    ORDER BY created_at DESC
  `).all(profile.dealer_number);
}

function getDealerStock(code = '') {
  return stockManager.getDealerSuppliedStock(code);
}

function getBestDealerForTool(toolSlug = '') {
  const best = priceAnalytics.getBestDealerByTool(String(toolSlug || '').trim().toLowerCase());
  if (!best) return null;
  const profile = best.dealer_code ? getDealerProfile(best.dealer_code) : null;
  return {
    tool_slug: toolSlug,
    dealer_code: best.dealer_code || profile?.dealer_code || '',
    dealer_name: best.dealer_name || profile?.name || best.dealer_number || 'Unknown',
    whatsapp_number: profile?.whatsapp_number || best.dealer_number || '',
    avg_price: Number(best.avg_price || 0),
    lowest_price: Number(best.lowest_price || 0),
    entries_count: Number(best.entries_count || 0),
    trust_score: Number(profile?.trust_score || 0)
  };
}

function getBestDealersByTool() {
  const tools = db.prepare(`
    SELECT DISTINCT tool_slug
    FROM dealer_rates
    WHERE trust_status IN ('trusted', 'manual_trusted')
    ORDER BY tool_slug ASC
  `).all();
  return tools
    .map(row => getBestDealerForTool(row.tool_slug))
    .filter(Boolean);
}

function getQuickWhatsAppContact(code = '') {
  const profile = getDealerProfile(code);
  if (!profile) return null;
  return {
    dealer_code: profile.dealer_code,
    name: profile.name || profile.dealer_code,
    whatsapp_number: profile.whatsapp_number,
    wa_link: `https://wa.me/${profile.whatsapp_number}`
  };
}

module.exports = {
  getAllTrustedDealers,
  getDealerProfile,
  getDealerRates,
  getDealerStock,
  getBestDealerForTool,
  getBestDealersByTool,
  getQuickWhatsAppContact
};
