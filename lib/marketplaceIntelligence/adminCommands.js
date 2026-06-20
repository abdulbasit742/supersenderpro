'use strict';
/**
 * adminCommands.js — WhatsApp admin command parser for Marketplace Intelligence.
 *
 * Standalone + safe: returns Urdu/English mixed reply strings. The server wires this
 * into the existing admin dispatcher (handleWhatsAppSocialAdminCommand). If no admin
 * system is available, this module can still be called directly.
 */
const mi = require('./index');

const COMMANDS = ['!marketstatus', '!topsellers', '!topbuyers', '!sku', '!price', '!stock', '!demand', '!opportunities', '!seller', '!buyer', '!marketdigest', '!riskposts'];

function isCommand(text) {
  const c = String(text || '').trim().split(/\s+/)[0].toLowerCase();
  return COMMANDS.includes(c);
}

function handle(command, args = []) {
  const cmd = String(command || '').toLowerCase();
  switch (cmd) {
    case '!marketstatus': {
      const s = mi.status();
      return `📊 *Market Status* (${s.dryRun ? 'DRY-RUN' : 'LIVE'})\nSellers: ${s.sellersTracked} | Buyers: ${s.buyersTracked} | SKUs: ${s.skusTracked}\nOffers today: ${s.offersToday} | Requests: ${s.buyerRequestsToday}\nPrice changes: ${s.priceChanges} | Risk posts: ${s.highRiskPosts}\nOpportunities: ${s.aiOpportunities}`;
    }
    case '!topsellers': {
      const top = mi.sellers().slice(0, 5);
      return top.length ? '🏆 *Top Sellers*\n' + top.map((s, i) => `${i + 1}. ${s.sellerNameSafe} — trust ${s.trustScore}, ${s.productsOffered} offers`).join('\n') : 'Abhi koi seller track nahi hua.';
    }
    case '!topbuyers': {
      const top = mi.buyers().sort((a, b) => b.conversionScore - a.conversionScore).slice(0, 5);
      return top.length ? '🛒 *Top Buyers*\n' + top.map((b, i) => `${i + 1}. ${b.buyerNameSafe} — score ${b.conversionScore} (${b.conversionBand})`).join('\n') : 'Abhi koi buyer demand nahi mili.';
    }
    case '!sku': {
      if (!args[0]) return 'Usage: !sku [sku-or-keyword]';
      const r = mi.search(args.join(' '), { types: ['sku', 'product'], limit: 8 });
      return r.length ? '🔎 *SKU*\n' + r.map(x => `• ${x.label} [${x.id}]`).join('\n') : 'Koi SKU match nahi hua.';
    }
    case '!price': {
      if (!args[0]) return 'Usage: !price [sku]';
      const p = mi.prices().find(x => x.sku.includes(args[0]));
      return p ? `💰 ${p.sku}\nLatest: ${p.latest} ${p.currency} | min ${p.min} / avg ${p.avg} / max ${p.max} (${p.sellerCount} sellers)` : 'Is SKU ka price record nahi mila.';
    }
    case '!stock': {
      if (!args[0]) return 'Usage: !stock [sku]';
      const s = mi.stock().find(x => x.sku.includes(args[0]));
      return s ? `📦 ${s.sku}: ${s.latestSignal} (${s.updates} updates)` : 'Stock signal nahi mila.';
    }
    case '!demand': {
      if (!args[0]) return 'Usage: !demand [product]';
      const r = mi.search(args.join(' '), { types: ['demand'], limit: 8 });
      return r.length ? '📈 *Demand*\n' + r.map(x => `• ${x.label}`).join('\n') : 'Koi demand signal nahi mila.';
    }
    case '!opportunities': {
      const o = mi.opportunities().slice(0, 6);
      return o.length ? '💡 *Opportunities*\n' + o.map(x => `• ${x.type} — ${x.sku || ''}`).join('\n') : 'Abhi koi opportunity detect nahi hui.';
    }
    case '!seller': {
      if (!args[0]) return 'Usage: !seller [sellerId]';
      const s = mi.sellers().find(x => x.sellerId.includes(args[0]));
      return s ? `👤 ${s.sellerNameSafe}\nTrust ${s.trustScore} (${s.trustBand}) | offers ${s.productsOffered} | risk: ${(s.riskFlags || []).join(',') || 'none'}` : 'Seller nahi mila.';
    }
    case '!buyer': {
      if (!args[0]) return 'Usage: !buyer [buyerId]';
      const b = mi.buyers().find(x => x.buyerId.includes(args[0]));
      return b ? `🧾 ${b.buyerNameSafe}\nScore ${b.conversionScore} (${b.conversionBand}) | requests ${b.requests}` : 'Buyer nahi mila.';
    }
    case '!marketdigest': return mi.digest().text;
    case '!riskposts': {
      const r = mi.search('', {}); // not used; use entities directly
      const risky = mi.entities('alert').slice(0, 8);
      return risky.length ? '⚠️ *Risk Posts*\n' + risky.map(x => `• ${x.label}`).join('\n') : 'Koi high-risk post nahi mila ✅';
    }
    default: return `Unknown market command: ${cmd}`;
  }
}

module.exports = { COMMANDS, isCommand, handle };
