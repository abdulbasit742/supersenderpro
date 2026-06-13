// ============================================================
//  Paperclip Webhook Receiver
//  POST /api/paperclip/webhook
// ============================================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '../data');
const waClient = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

function readJson(file, fallback) {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(value, null, 2));
}

function appendLog(entry) {
  try {
    const logs = readJson('paperclip_log.json', []);
    logs.push({
      timestamp: new Date().toISOString(),
      ...entry
    });
    writeJson('paperclip_log.json', logs.slice(-500));
  } catch {}
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizePhone(phone) {
  let raw = String(phone || '').replace(/\D/g, '');
  if (!raw) return '';
  if (raw.startsWith('0')) raw = `92${raw.slice(1)}`;
  if (raw.startsWith('03')) raw = `92${raw.slice(1)}`;
  if (raw.length === 10 && raw.startsWith('3')) raw = `92${raw}`;
  return raw;
}

function collectObjects(input, output = [], seen = new Set()) {
  if (!input || seen.has(input)) return output;
  if (Array.isArray(input)) {
    for (const item of input) collectObjects(item, output, seen);
    return output;
  }
  if (typeof input !== 'object') return output;
  seen.add(input);
  output.push(input);
  const nestedKeys = ['result', 'output', 'data', 'payload', 'product', 'products', 'laptop', 'laptops', 'catalog', 'lead', 'customer', 'customers', 'contact', 'contacts', 'message'];
  for (const key of nestedKeys) {
    if (input[key] !== undefined && input[key] !== null) {
      collectObjects(input[key], output, seen);
    }
  }
  return output;
}

function isLikelyProduct(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return !!(obj.name || obj.title) && (
    obj.price !== undefined ||
    obj.stock !== undefined ||
    obj.quantity !== undefined ||
    obj.image ||
    obj.url ||
    obj.link ||
    obj.condition ||
    obj.specs ||
    obj.description
  );
}

function buildProductRecord(obj) {
  const price = Number(obj.price || obj.amount || 0);
  const stockValue = obj.stock === undefined
    ? (obj.quantity === undefined ? true : Number(obj.quantity) > 0)
    : obj.stock !== false;
  return {
    id: obj.id || `pc_prod_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    name: obj.name || obj.title || 'Paperclip Product',
    brand: obj.brand || '',
    price: Number.isFinite(price) ? price : 0,
    stock: stockValue,
    quantity: obj.quantity !== undefined ? Number(obj.quantity) || 0 : undefined,
    image: obj.image || obj.imageUrl || obj.image_url || '',
    url: obj.url || obj.link || obj.productUrl || obj.product_url || '',
    condition: obj.condition || obj.state || 'Imported',
    description: obj.description || obj.details || '',
    specs: obj.specs || obj.specification || '',
    source: 'paperclip',
    updatedAt: new Date().toISOString()
  };
}

function upsertProductsFromPayload(payload) {
  const productsFile = path.join(DATA_DIR, 'laptop_products.json');
  const products = readJson('laptop_products.json', []);
  const objects = collectObjects(payload, []);
  const candidates = objects.filter(isLikelyProduct);
  if (!candidates.length) return [];

  const actions = [];
  for (const candidate of candidates) {
    const record = buildProductRecord(candidate);
    const idx = products.findIndex((product) => {
      const ids = [
        product.id,
        product.url,
        product.link,
        product.name
      ].map((value) => String(value || '').trim().toLowerCase());
      return ids.includes(String(record.id).trim().toLowerCase())
        || (record.url && ids.includes(String(record.url).trim().toLowerCase()))
        || (record.name && ids.includes(String(record.name).trim().toLowerCase()));
    });

    if (idx >= 0) {
      products[idx] = {
        ...products[idx],
        ...record,
        updatedAt: new Date().toISOString()
      };
      actions.push({ action: 'updated_product', id: products[idx].id, name: products[idx].name });
    } else {
      products.unshift(record);
      actions.push({ action: 'added_product', id: record.id, name: record.name });
    }
  }
  writeJson('laptop_products.json', products);
  return actions;
}

function isLikelyLead(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return !!(
    obj.phone ||
    obj.number ||
    obj.whatsapp ||
    obj.mobile ||
    obj.email ||
    obj.businessName ||
    obj.business_name ||
    obj.company ||
    obj.name
  );
}

function buildLeadRecord(obj) {
  const number = normalizePhone(obj.phone || obj.number || obj.whatsapp || obj.mobile || obj.customerNumber || '');
  return {
    id: obj.id || `pc_lead_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    name: obj.name || obj.customerName || obj.businessName || obj.business_name || obj.company || 'Paperclip Lead',
    number,
    phone: number,
    email: obj.email || '',
    business: obj.businessName || obj.business_name || obj.company || obj.business || '',
    source: obj.source || 'paperclip_agent',
    status: obj.status || 'new',
    notes: obj.notes || obj.message || '',
    createdAt: new Date().toISOString()
  };
}

function upsertLeadIntoCustomers(payload) {
  const customers = readJson('customers.json', []);
  const objects = collectObjects(payload, []);
  const candidates = objects.filter(isLikelyLead);
  if (!candidates.length) return [];

  const actions = [];
  for (const candidate of candidates) {
    const record = buildLeadRecord(candidate);
    if (!record.number && !record.email) continue;
    const idx = customers.findIndex((customer) => {
      const customerPhone = normalizePhone(customer.number || customer.phone || customer.whatsapp || '');
      const customerEmail = String(customer.email || '').trim().toLowerCase();
      return (record.number && customerPhone && record.number === customerPhone)
        || (record.email && customerEmail && record.email.toLowerCase() === customerEmail)
        || (record.name && String(customer.name || '').trim().toLowerCase() === String(record.name).trim().toLowerCase());
    });

    if (idx >= 0) {
      customers[idx] = {
        ...customers[idx],
        ...record,
        updatedAt: new Date().toISOString()
      };
      actions.push({ action: 'updated_lead', id: customers[idx].id, name: customers[idx].name });
    } else {
      customers.unshift(record);
      actions.push({ action: 'added_lead', id: record.id, name: record.name });
    }
  }
  writeJson('customers.json', customers);
  return actions;
}

async function sendWhatsApp(number, message) {
  const cleanNumber = normalizePhone(number);
  const text = String(message || '').trim();
  if (!cleanNumber || !text) return { success: false, error: 'Missing number or message' };
  const res = await waClient.post('/api/wa/send', {
    number: cleanNumber,
    text
  });
  return res.data || { success: true };
}

function extractMessageToSend(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = parseMaybeJson(
    payload.whatsappMessage
    || payload.messageToSend
    || payload.sendMessage
    || payload.textToSend
    || payload.reply
    || payload.message
    || payload.text
    || ''
  );
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (candidate && typeof candidate === 'object') {
    return String(candidate.message || candidate.text || candidate.body || candidate.caption || '').trim() || null;
  }
  return null;
}

async function processWebhookResult(payload) {
  const result = parseMaybeJson(
    payload.result ?? payload.output ?? payload.data ?? payload.payload ?? payload.message ?? payload.text ?? payload
  );
  const actions = [];

  if (payload.type === 'issue.completed' || payload.type === 'agent.completed' || payload.completed === true) {
    const productActions = upsertProductsFromPayload(result);
    const leadActions = upsertLeadIntoCustomers(result);
    actions.push(...productActions, ...leadActions);
  } else {
    actions.push(...upsertProductsFromPayload(result));
    actions.push(...upsertLeadIntoCustomers(result));
  }

  const message = extractMessageToSend(payload) || extractMessageToSend(result);
  const phone = normalizePhone(payload.phone || payload.to || payload.number || payload.whatsapp || payload.customerPhone || '');
  if (message && phone) {
    await sendWhatsApp(phone, message);
    actions.push({ action: 'whatsapp_sent', number: phone });
  } else if (payload.sendWhatsApp && phone && message) {
    await sendWhatsApp(phone, message);
    actions.push({ action: 'whatsapp_sent', number: phone });
  }

  return actions;
}

router.post('/paperclip/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    appendLog({ type: 'webhook_received', payload });

    const actions = await processWebhookResult(payload);
    appendLog({ type: 'webhook_processed', actions, sourceType: payload.type || 'unknown' });

    res.json({ success: true, received: true, actions });
  } catch (error) {
    appendLog({ type: 'webhook_error', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
