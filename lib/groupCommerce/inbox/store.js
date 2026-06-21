 'use strict';

 /**
     * Group Commerce Inbox — JSON-file store (no DB).
     * - Stores normalized inbox records only. Never full raw message bodies (unless
     *   GROUP_COMMERCE_INBOX_STORE_RAW=true, which is off by default).
     * - PII (phones/emails) is masked before persisting.
     * - Defensive: never throws on read/write; degrades gracefully.
     */

 const fs = require('fs');
 const path = require('path');
 const crypto = require('crypto');

 const STORE_PATH = process.env.GROUP_COMMERCE_INBOX_STORE_PATH || 'data/group-commerce-inbox.json';
 const MAX_ITEMS = parseInt(process.env.GROUP_COMMERCE_INBOX_MAX_ITEMS, 10) || 1000;
 const STORE_RAW = String(process.env.GROUP_COMMERCE_INBOX_STORE_RAW || 'false').toLowerCase() === 'true';

 function resolvePath() {
      return path.join(process.cwd(), STORE_PATH);
 }

 function ensureFile() {
      try {
        const p = resolvePath();
          const dir = path.dirname(p);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({ items: [] }, null, 2), 'utf8');
      } catch (e) { /* defensive */ }
 }

 function read() {
   ensureFile();
      try {
        const parsed = JSON.parse(fs.readFileSync(resolvePath(), 'utf8'));
          if (!Array.isArray(parsed.items)) parsed.items = [];
          return parsed;
      } catch (e) {
        return { items: [] };
      }
 }

 function write(data) {
      try {
        if (data.items && data.items.length > MAX_ITEMS) {
              data.items = data.items.slice(data.items.length - MAX_ITEMS);
          }

       fs.writeFileSync(resolvePath(), JSON.stringify(data, null, 2), 'utf8');
     return true;
   } catch (e) {
       return false;
   }
}


function genId() {
return 'gci_' + crypto.randomBytes(8).toString('hex');
}

// -------------------- PII masking --------------------

function maskPhone(v) {
if (!v) return null;
   const digits = String(v).replace(/[^0-9]/g, '');
   if (digits.length <= 4) return '****';
   return digits.slice(0, 2) + '****' + digits.slice(-2);
}


function maskId(v) {
   if (!v) return null;
   const s = String(v);
   if (/^[0-9+]/.test(s)) return maskPhone(s);
   if (s.length <= 4) return s[0] + '***';
   return s.slice(0, 2) + '***' + s.slice(-2);
}

function sanitizePreview(s) {
   if (!s) return null;
   let out = String(s).slice(0, 140);
   // redact long digit runs (phones) and emails inside the preview
   out = out.replace(/\b\d{7,}\b/g, function (m) { return m.slice(0, 2) + '****' + m.slice(-2); });
   out = out.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, function (m) {
     const parts = m.split('@'); return parts[0][0] + '***@' + parts[1];
   });
   return out;
}

const ALLOWED_TYPES = [
'seller_offer', 'buyer_request', 'price_update', 'stock_update', 'catalog_update',
   'moderation_flag', 'suspicious_post', 'admin_command', 'ai_suggestion',
   'relay_opportunity', 'ecommerce_opportunity',
];

const RISK_LEVELS = ['low', 'medium', 'high'];


// Normalize + sanitize an incoming (already-analyzed) record into the canonical shape.
function normalize(input) {
   const i = input || {};
   const now = new Date().toISOString();
   const type = ALLOWED_TYPES.indexOf(i.type) !== -1 ? i.type : 'ai_suggestion';
   const risk = RISK_LEVELS.indexOf(i.riskLevel) !== -1 ? i.riskLevel : 'low';
   let confidence = Number(i.confidence);
   if (!Number.isFinite(confidence)) confidence = 0;
   confidence = Math.max(0, Math.min(1, confidence));

  const record = {
    id: i.id || genId(),
    groupId: i.groupId ? String(i.groupId).slice(0, 64) : null,
    groupName: i.groupName ? String(i.groupName).slice(0, 120) : null,
    type: type,
    roleIntent: ['seller', 'buyer', 'unknown'].indexOf(i.roleIntent) !== -1 ? i.roleIntent : 'unknown',
    productName: i.productName ? String(i.productName).slice(0, 120) : null,
    sku: i.sku ? String(i.sku).slice(0, 64) : null,
    quantity: Number.isFinite(Number(i.quantity)) ? Number(i.quantity) : null,
    price: Number.isFinite(Number(i.price)) ? Number(i.price) : null,
    currency: i.currency ? String(i.currency).slice(0, 8) : null,
    stockStatus: i.stockStatus ? String(i.stockStatus).slice(0, 24) : 'unknown',
    sellerIdMasked: maskId(i.sellerId || i.sellerIdMasked || i.sellerHash),
    buyerIdMasked: maskId(i.buyerId || i.buyerIdMasked || i.buyerHash),
    confidence: Number(confidence.toFixed(2)),
    riskLevel: risk,
    flags: Array.isArray(i.flags) ? i.flags.slice(0, 20).map(function (f) { return String(f).slice(0, 40); }) : [],
    suggestedActions: Array.isArray(i.suggestedActions) ? i.suggestedActions.slice(0, 20) : [],
    sourcePreview: sanitizePreview(i.sourcePreview || i.message || i.text),
    resolved: i.resolved === true,
    createdAt: i.createdAt || now,
    updatedAt: now,
  };

  // Only keep raw if explicitly enabled (off by default).
  if (STORE_RAW && (i.raw || i.message || i.text)) {
    record._raw = String(i.raw || i.message || i.text).slice(0, 2000);
  }
  return record;
}


function add(input) {
const record = normalize(input);
  const data = read();
  data.items.push(record);
  write(data);
  return record;
}


function list() {
return read().items.slice();
}

function getById(id) {
return read().items.find(function (x) { return x.id === id; }) || null;
}


function update(id, patch) {
const data = read();
  const idx = data.items.findIndex(function (x) { return x.id === id; });
  if (idx === -1) return null;
  // Re-normalize merged record to keep masking + shape guarantees.
  const merged = Object.assign({}, data.items[idx], patch || {}, { id: id, createdAt: data.items[idx].createdAt });
  const next = normalize(merged);
  data.items[idx] = next;
  write(data);
  return next;

}


function remove(id) {
   const data = read();
   const before = data.items.length;
   data.items = data.items.filter(function (x) { return x.id !== id; });
   write(data);
   return before !== data.items.length;
}


function status() {
   ensureFile();
   let writable = false;
   try { fs.accessSync(resolvePath(), fs.constants.W_OK); writable = true; } catch (e) { writable = false; }
   return {
     path: STORE_PATH,
     writable: writable,
     items: read().items.length,
     maxItems: MAX_ITEMS,
     storeRaw: STORE_RAW,
   };
}


module.exports = {
ALLOWED_TYPES, RISK_LEVELS,
   maskPhone, maskId, sanitizePreview, normalize,
   add, list, getById, update, remove, status,
};
