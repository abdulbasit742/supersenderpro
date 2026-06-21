'use strict';

/**
    * Group Commerce Inbox — market summary / intelligence.
    * Computes aggregates from locally-stored normalized inbox records only.
    * No external APIs. No secrets. Seller IDs already masked upstream.
    */

function inc(map, key, by) {
     if (!key) return;
     map[key] = (map[key] || 0) + (by == null ? 1 : by);
}

function topEntries(map, n) {
  return Object.keys(map)
       .map(function (k) { return { key: k, count: map[k] }; })
       .sort(function (a, b) { return b.count - a.count; })
       .slice(0, n || 10);
}


function summarize(items) {
     const list = Array.isArray(items) ? items : [];


     const productMentions = {};
     const skuMentions = {};
     const sellerMentions = {};
     const pricesBySku = {};    // sku -> { latest, min, max, latestAt }
     let stockAvailable = 0;
     let stockOut = 0;
     let buyerDemand = 0;
     let suspiciousCount = 0;
     const groupActivity = {};
     const opportunities = [];

     list.forEach(function (x) {
       if (x.productName) inc(productMentions, x.productName);
       if (x.sku) inc(skuMentions, x.sku);
       if (x.sellerIdMasked) inc(sellerMentions, x.sellerIdMasked);
       if (x.groupId) inc(groupActivity, x.groupName || x.groupId);

       if (x.stockStatus === 'in_stock') stockAvailable++;
       else if (x.stockStatus === 'out_of_stock') stockOut++;

       if (x.roleIntent === 'buyer' || x.type === 'buyer_request') buyerDemand++;
       if (x.type === 'suspicious_post' || x.riskLevel === 'high') suspiciousCount++;

       if (x.sku && x.price != null) {

         const cur = pricesBySku[x.sku] || { latest: null, min: null, max: null, latestAt: 0, currency: x.currency || null
};
         const at = new Date(x.createdAt).getTime() || 0;
         cur.min = cur.min == null ? x.price : Math.min(cur.min, x.price);
         cur.max = cur.max == null ? x.price : Math.max(cur.max, x.price);
         if (at >= cur.latestAt) { cur.latest = x.price; cur.latestAt = at; cur.currency = x.currency || cur.currency; }
         pricesBySku[x.sku] = cur;
     }

     // Opportunity heuristics (preview/draft only, not actions).
     if ((x.type === 'seller_offer' || x.roleIntent === 'seller') && (x.confidence || 0) >= 0.7) {
    opportunities.push({ kind: 'relay_opportunity', reason: 'high-confidence seller offer', sku: x.sku, productName:
x.productName, groupId: x.groupId });
     }
     if (x.type === 'buyer_request' || x.roleIntent === 'buyer') {
    opportunities.push({ kind: 'ecommerce_opportunity', reason: 'buyer demand could match catalog', productName:
x.productName, groupId: x.groupId });
     }
   });


   const latestPricePerSku = Object.keys(pricesBySku).map(function (sku) {
     const p = pricesBySku[sku];
     return { sku: sku, latest: p.latest, min: p.min, max: p.max, currency: p.currency };
   });

   return {
     totals: {
         items: list.length,
         groups: Object.keys(groupActivity).length,
         stockAvailable: stockAvailable,
         stockOut: stockOut,
         buyerDemand: buyerDemand,
         suspiciousCount: suspiciousCount,
     },
     topProducts: topEntries(productMentions, 10),
     topSkus: topEntries(skuMentions, 10),
     topSellersMasked: topEntries(sellerMentions, 10),
     latestPricePerSku: latestPricePerSku,
     groupActivity: topEntries(groupActivity, 20),
     suggestedOpportunities: opportunities.slice(0, 25),
     note: 'Computed from local inbox records only. No external calls. Seller IDs masked.',
   };
}


module.exports = { summarize };
