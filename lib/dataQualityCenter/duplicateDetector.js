  'use strict';

  const crypto = require('crypto');


  // Optional read-only reuse of the existing product detector.
  let productDetector = null;
  try {
      // eslint-disable-next-line global-require
      productDetector = require('../productCatalogMaster/duplicateDetector');
  } catch (_) {
    productDetector = null; // absent is fine; generic pass still works
  }

  function normalize(value) {
    return String(value == null ? '' : value)
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/[^a-z0-9 ]/g, '')
          .trim();
  }


  function normalizePhone(value) {
    return String(value == null ? '' : value).replace(/\D/g, '');
  }

  function keyFor(record, fields) {
    const parts = fields.map((f) => {
          const v = record[f];
          if (/phone|mobile|whatsapp/i.test(f)) return normalizePhone(v);
        return normalize(v);
      });
      if (parts.every((p) => !p)) return null; // all-empty -> not a key
      return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
  }

  // Cluster records that share a normalized composite key.
  function findDuplicateGroups(records, fields, idField = 'id') {
      const buckets = new Map();
      for (const rec of Array.isArray(records) ? records : []) {
          const k = keyFor(rec || {}, fields);
          if (!k) continue;
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k).push(rec);
      }


   const groups = [];
   for (const [k, members] of buckets.entries()) {
     if (members.length > 1) {
           groups.push({
             key: k,
             matchedOn: fields,
             size: members.length,
             memberIds: members.map((m) => m[idField]),
           });
       }
   }
   return groups.sort((a, b) => b.size - a.size);
}

// Product-specific path: prefer existing detector if it exposes a compatible fn.
function findProductDuplicates(products) {
 if (productDetector && typeof productDetector.findDuplicates === 'function') {
       try {
         const res = productDetector.findDuplicates(products);
         if (Array.isArray(res)) return { source: 'productCatalogMaster', groups: res };
       } catch (_) { /* fall through to generic */ }
   }
   return { source: 'generic', groups: findDuplicateGroups(products, ['sku', 'name'], 'id') };
}

module.exports = { normalize, normalizePhone, keyFor, findDuplicateGroups, findProductDuplicates };
