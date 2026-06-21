// lib/groupCommerce/catalog.js
// Group Commerce OS - per-group catalogue built from analyzed seller offers.
// No live ecommerce writes. Generates post DRAFTS only.

'use strict';

const store = require('./store');
const nowMs = () => Date.now();
function maskPreview(s) { return String(s || '').slice(0, 80).replace(/\b\d{7,}\b/g, (m) => m.replace(/.(?=.{4})/g,
'•')); }


function catalogKey(groupId) { return String(groupId); }

function listCatalog(groupId) {
  const db = store.readGroups();
    return (db.catalogs[catalogKey(groupId)] || { items: {}, updatedAt: 0 });
}

// item: { sku, productName, sellerHash, price, currency, stockStatus, sourcePreview }
function upsertItem(groupId, item) {
  const db = store.readGroups();
    const key = catalogKey(groupId);
    const cat = db.catalogs[key] || { items: {}, updatedAt: 0 };
    const id = (item.sku || item.productName || 'item').toString().toLowerCase();
    const prev = cat.items[id] || { offers: [], minPrice: null, maxPrice: null, latestPrice: null, trustedSellers: [] };

    if (item.price != null) {
        prev.latestPrice = item.price;
        prev.minPrice = prev.minPrice == null ? item.price : Math.min(prev.minPrice, item.price);
        prev.maxPrice = prev.maxPrice == null ? item.price : Math.max(prev.maxPrice, item.price);
    }
    prev.productName = item.productName || prev.productName || id;
    prev.sku = item.sku || prev.sku || null;
    prev.stockStatus = item.stockStatus || prev.stockStatus || 'unknown';
    prev.currency = item.currency || prev.currency || 'PKR';
  prev.offers = (prev.offers || []).concat([{ sellerHash: item.sellerHash || null, price: item.price, at: nowMs(),
sourcePreview: maskPreview(item.sourcePreview) }]).slice(-25);
  if (item.trustedSeller && item.sellerHash && !prev.trustedSellers.includes(item.sellerHash))
prev.trustedSellers.push(item.sellerHash);

    cat.items[id] = prev;


     cat.updatedAt = nowMs();
     db.catalogs[key] = cat;
     store.writeGroups(db);
     return prev;
}

// Generate a WhatsApp group catalog post DRAFT (string). Never sent here.
function groupPostDraft(groupId) {
  const cat = listCatalog(groupId);
     const items = Object.values(cat.items || {});
     if (!items.length) return { draft: 'No catalogue items yet.', items: 0 };
     const lines = ['*Group Catalogue*', ''];
     for (const it of items.slice(0, 30)) {
      const price = it.latestPrice != null ? `${it.currency} ${it.latestPrice}` : 'ask';
      const range = (it.minPrice != null && it.maxPrice != null && it.minPrice !== it.maxPrice) ? ` (${it.currency}
${it.minPrice}-${it.maxPrice})` : '';
    lines.push(`• ${it.productName}${it.sku ? ' [' + it.sku + ']' : ''}: ${price}${range} ${it.stockStatus === 'in_stock'
? '  ✅' : ''}`);
  }
  return { draft: lines.join('\n'), items: items.length };
}


// Channel/social variant (slightly different framing).
function channelPostDraft(groupId) {
     const base = groupPostDraft(groupId);
     return { draft: base.draft + '\n\nDM to order.', items: base.items };
}

module.exports = { listCatalog, upsertItem, groupPostDraft, channelPostDraft };
