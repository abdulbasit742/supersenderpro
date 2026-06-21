 'use strict';

 /**
     * Group Commerce Inbox — filtering, search, and sorting helpers.
     * Pure functions over an array of normalized inbox records. No I/O, no secrets.
     */


 function asTime(v) {
   const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : 0;
 }


 // criteria: {
 //       groupId, type, roleIntent, sku, product, sellerIdMasked, buyerIdMasked,
 //       riskLevel, minConfidence, maxConfidence, from, to,
 //   unresolvedOnly, highValueOnly, suspiciousOnly, minPrice, query
 // }
 function apply(items, criteria) {
   const c = criteria || {};
      let out = Array.isArray(items) ? items.slice() : [];

      if (c.groupId) out = out.filter(function (x) { return x.groupId === c.groupId; });
      if (c.type) out = out.filter(function (x) { return x.type === c.type; });
      if (c.roleIntent) out = out.filter(function (x) { return x.roleIntent === c.roleIntent; });
      if (c.sku) out = out.filter(function (x) { return x.sku && x.sku.toLowerCase() === String(c.sku).toLowerCase(); });
      if (c.product) {
        const q = String(c.product).toLowerCase();
          out = out.filter(function (x) { return x.productName && x.productName.toLowerCase().indexOf(q) !== -1; });
      }
      if (c.sellerIdMasked) out = out.filter(function (x) { return x.sellerIdMasked === c.sellerIdMasked; });
      if (c.buyerIdMasked) out = out.filter(function (x) { return x.buyerIdMasked === c.buyerIdMasked; });
      if (c.riskLevel) out = out.filter(function (x) { return x.riskLevel === c.riskLevel; });

      if (c.minConfidence != null) out = out.filter(function (x) { return (x.confidence || 0) >= Number(c.minConfidence); });
      if (c.maxConfidence != null) out = out.filter(function (x) { return (x.confidence || 0) <= Number(c.maxConfidence); });

      if (c.from) { const f = asTime(c.from); out = out.filter(function (x) { return asTime(x.createdAt) >= f; }); }
      if (c.to) { const t = asTime(c.to); out = out.filter(function (x) { return asTime(x.createdAt) <= t; }); }

      if (c.unresolvedOnly) out = out.filter(function (x) { return !x.resolved; });
      if (c.suspiciousOnly) out = out.filter(function (x) { return x.type === 'suspicious_post' || x.riskLevel === 'high';
 });
   if (c.highValueOnly) {
          const min = Number(c.minPrice) || 1000;
          out = out.filter(function (x) {
       return (x.price != null && x.price >= min) || (x.confidence || 0) >= 0.7 || x.type === 'ecommerce_opportunity' ||
 x.type === 'relay_opportunity';

       });
   }

   if (c.query) {
     const q = String(c.query).toLowerCase();
       out = out.filter(function (x) {
         return [x.productName, x.sku, x.groupName, x.sourcePreview, x.type]
             .filter(Boolean)
             .some(function (f) { return String(f).toLowerCase().indexOf(q) !== -1; });
       });
   }

   return out;
}


const SORTS = {
newest: function (a, b) { return asTime(b.createdAt) - asTime(a.createdAt); },
   oldest: function (a, b) { return asTime(a.createdAt) - asTime(b.createdAt); },
   highest_price: function (a, b) { return (b.price || 0) - (a.price || 0); },
   lowest_price: function (a, b) { return (a.price || 0) - (b.price || 0); },
   highest_confidence: function (a, b) { return (b.confidence || 0) - (a.confidence || 0); },
   highest_risk: function (a, b) { return riskRank(b.riskLevel) - riskRank(a.riskLevel); },
};


function riskRank(r) { return r === 'high' ? 3 : r === 'medium' ? 2 : 1; }


function sort(items, sortKey) {
   const fn = SORTS[sortKey] || SORTS.newest;
   return (Array.isArray(items) ? items.slice() : []).sort(fn);
}

function query(items, criteria, sortKey, limit) {
let out = apply(items, criteria);
   out = sort(out, sortKey);
   if (Number.isFinite(Number(limit))) out = out.slice(0, Number(limit));
   return out;
}


module.exports = { apply, sort, query, SORTS: Object.keys(SORTS) };
