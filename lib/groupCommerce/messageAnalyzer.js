// lib/groupCommerce/messageAnalyzer.js
// Group Commerce OS - seller/buyer/SKU intelligence. Pure heuristics, no AI key
// required (an LLM can be layered on later). Returns a normalized result.

'use strict';

const SELLER_HINTS = ['available', 'stock', 'mojood', 'for sale', 'selling', 'rate', 'price', 'deliver', 'cod', 'dealer',
'wholesale', 'per piece', 'pcs'];
const BUYER_HINTS = ['need', 'chahiye', 'want', 'looking for', 'required', 'dm me', 'how much', 'kitne ka', 'kitna',
'order karna'];
const CURRENCIES = [['rs', 'PKR'], ['pkr', 'PKR'], ['$', 'USD'], ['usd', 'USD'], ['aed', 'AED'], ['inr', 'INR']];
const STOCK_IN = ['in stock', 'available', 'mojood', 'ready', 'haazir'];
const STOCK_OUT = ['out of stock', 'sold', 'khatam', 'not available', 'na mojood'];

function lc(s) { return String(s || '').toLowerCase(); }
function countHits(t, arr) { return arr.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0); }

function extractPrice(t) {
  // matches "rs 1500", "pkr 1,500", "$20", "1500/-"
    const m = t.match(/(?:rs|pkr|usd|aed|inr|\$)\s*([\d,]+(?:\.\d{1,2})?)/i) || t.match(/\b([\d,]{3,})\s*\/?-/);
    if (!m) return null;
    return Number(String(m[1]).replace(/,/g, ''));
}
function extractCurrency(t) {
  for (const [k, code] of CURRENCIES) if (t.includes(k)) return code;
    return null;
}
function extractSku(raw) {
  // SKU-like token: letters+digits, e.g. CHATGPT-1M, SKU123, AB-2299
    const m = String(raw).match(/\b([A-Z]{2,}[-_]?[A-Z0-9]{2,})\b/);
    return m ? m[1] : null;
}
function extractQty(t) {
    const m = t.match(/\b(\d{1,4})\s*(pcs|piece|pieces|qty|units?|adad)\b/);
    return m ? Number(m[1]) : null;
}
function extractCity(t) {
  const cities = ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta',
'sialkot', 'gujranwala'];
    for (const c of cities) if (t.includes(c)) return c;
    return null;
}


function analyze(rawMessage) {
   const raw = String(rawMessage || '');
   const t = lc(raw);
   const sellerHits = countHits(t, SELLER_HINTS);
   const buyerHits = countHits(t, BUYER_HINTS);
   const price = extractPrice(t);
   const currency = extractCurrency(t);
   const sku = extractSku(raw);
   const qty = extractQty(t);
   const city = extractCity(t);

   let stockStatus = 'unknown';
   if (STOCK_IN.some((w) => t.includes(w))) stockStatus = 'in_stock';
   else if (STOCK_OUT.some((w) => t.includes(w))) stockStatus = 'out_of_stock';


   // Confidence: hint density + presence of commerce signals.
   const sellerConfidence = clamp01((sellerHits * 0.15) + (price ? 0.25 : 0) + (stockStatus === 'in_stock' ? 0.2 : 0));
   const buyerConfidence = clamp01((buyerHits * 0.2) + (price && buyerHits ? 0.1 : 0));
   const roleIntent = sellerConfidence >= buyerConfidence && sellerConfidence > 0.3 ? 'seller'
     : buyerConfidence > 0.3 ? 'buyer' : 'unknown';

   const flags = [];
   if (price && !sku) flags.push('price_without_sku');
   if ((stockStatus === 'in_stock') && !sku && !productName(raw)) flags.push('stock_without_product');
   if (/\b(advance|pehle paise|pay first|send payment)\b/i.test(raw)) flags.push('payment_first_claim');


   return {
     roleIntent,
     sku,
     productName: productName(raw),
     quantity: qty,
     price,
     currency: currency || (price ? 'PKR' : null),
     stockStatus,
     city,
     sellerConfidence: round2(sellerConfidence),
     buyerConfidence: round2(buyerConfidence),
     flags,
   };
}


// Naive product name guess: first capitalized multiword run or known tool names.
function productName(raw) {
   const known = ['chatgpt', 'midjourney', 'canva', 'netflix', 'spotify', 'grammarly', 'capcut', 'envato'];
   const t = lc(raw);
   for (const k of known) if (t.includes(k)) return k;
   const m = raw.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b/);
   return m ? m[1] : null;
}

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function round2(n) { return Number(n.toFixed(2)); }

module.exports = { analyze, extractPrice, extractSku, productName };
