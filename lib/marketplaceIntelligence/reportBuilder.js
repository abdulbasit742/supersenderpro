'use strict';
/** reportBuilder.js — safe JSON / Markdown / CSV reports (no external deps). */
const sellerRanking = require('./sellerRanking');
const buyerProfiler = require('./buyerProfiler');
const priceRadar = require('./priceRadar');
const stockRadar = require('./stockRadar');
const opportunityDetector = require('./opportunityDetector');

function toCsv(rows, cols) {
  const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}

function reports(state) {
  const sellers = sellerRanking.leaderboard(state, 100);
  const buyers = buyerProfiler.profiles(state);
  const prices = priceRadar.summarize(state);
  const stock = stockRadar.summarize(state);
  const opps = opportunityDetector.detect(state);
  const risk = Object.values(state.entities).filter(e => (e.riskFlags || []).length).map(e => ({ id: e.id, type: e.type, label: e.label, riskFlags: (e.riskFlags || []).join('|') }));
  return { sellers, buyers, prices, stock, opps, risk };
}

function build(state, kind = 'all', format = 'json') {
  const r = reports(state);
  const sets = {
    seller_ranking: { rows: r.sellers, cols: ['sellerNameSafe', 'trustScore', 'rankScore', 'productsOffered', 'priceCompetitiveness'] },
    buyer_demand: { rows: r.buyers, cols: ['buyerNameSafe', 'conversionScore', 'conversionBand', 'requests', 'urgency'] },
    sku_price: { rows: r.prices, cols: ['sku', 'currency', 'latest', 'min', 'max', 'avg', 'sellerCount'] },
    stock: { rows: r.stock, cols: ['sku', 'latestSignal', 'updates', 'lastUpdate'] },
    opportunity: { rows: r.opps, cols: ['type', 'sku', 'confidence'] },
    risk: { rows: r.risk, cols: ['id', 'type', 'label', 'riskFlags'] }
  };
  if (format === 'csv') {
    if (kind === 'all') return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, toCsv(v.rows, v.cols)]));
    const s = sets[kind]; return s ? toCsv(s.rows, s.cols) : '';
  }
  if (format === 'markdown') {
    const md = (title, s) => `## ${title}\n\n| ${s.cols.join(' | ')} |\n| ${s.cols.map(() => '---').join(' | ')} |\n${s.rows.map(row => `| ${s.cols.map(c => row[c] ?? '').join(' | ')} |`).join('\n')}\n`;
    if (kind === 'all') return '# Marketplace Intelligence Report\n\n' + Object.entries(sets).map(([k, v]) => md(k, v)).join('\n');
    return sets[kind] ? md(kind, sets[kind]) : '';
  }
  // json
  if (kind === 'all') return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.rows]));
  return sets[kind] ? sets[kind].rows : [];
}

module.exports = { build, reports };
