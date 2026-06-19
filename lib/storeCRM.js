const fs   = require('fs');
const path = require('path');

const CRM_DIR = path.join(__dirname, '../data/store_crm');
if (!fs.existsSync(CRM_DIR)) fs.mkdirSync(CRM_DIR, { recursive: true });

// Each store has: data/store_crm/{storeId}_customers.json
//                 data/store_crm/{storeId}_interactions.json
//                 data/store_crm/{storeId}_followups.json

function crmFile(storeId, type) {
  return path.join(CRM_DIR, `${storeId}_${type}.json`);
}

function readCRM(storeId, type, fallback) {
  const f = crmFile(storeId, type);
  try {
    if (!fs.existsSync(f)) { fs.writeFileSync(f, JSON.stringify(fallback, null, 2)); return fallback; }
    return JSON.parse(fs.readFileSync(f));
  } catch { return fallback; }
}

function writeCRM(storeId, type, data) {
  fs.writeFileSync(crmFile(storeId, type), JSON.stringify(data, null, 2));
}

// ── Tier Calculator ────────────────────────────────────────────
function getTier(totalSpent) {
  if (totalSpent >= 50000) return { tier: 'VIP',    label: '👑 VIP',    color: 'gold'   };
  if (totalSpent >= 20000) return { tier: 'Gold',   label: '🥇 Gold',   color: 'amber'  };
  if (totalSpent >= 5000)  return { tier: 'Silver', label: '🥈 Silver', color: 'silver' };
  return                          { tier: 'Bronze', label: '🥉 Bronze', color: 'bronze' };
}

// ── Customer CRUD ──────────────────────────────────────────────
function getCustomer(storeId, phone) {
  const data = readCRM(storeId, 'customers', { customers: [] });
  return data.customers.find(c => c.phone === phone) || null;
}

function upsertCustomer(storeId, phone, updates = {}) {
  const data = readCRM(storeId, 'customers', { customers: [] });
  let c = data.customers.find(x => x.phone === phone);

  if (!c) {
    c = {
      phone,
      name:           updates.name || '',
      city:           updates.city || '',
      firstContact:   new Date().toISOString(),
      lastContact:    new Date().toISOString(),
      totalOrders:    0,
      totalSpent:     0,
      avgOrderValue:  0,
      tags:           [],
      notes:          [],
      preferredPayment: '',
      preferredProducts: [],
      status:         'active',   // active | inactive | blocked
      source:         updates.source || 'whatsapp',
      promoOptIn:     true,
      weeklyMsgCount: 0,
      ...getTier(0),
    };
    data.customers.push(c);
  }

  // Apply updates
  Object.assign(c, updates);
  c.lastContact = new Date().toISOString();

  // Recalculate tier
  const tierInfo = getTier(c.totalSpent);
  c.tier  = tierInfo.tier;
  c.label = tierInfo.label;

  writeCRM(storeId, 'customers', data);
  return c;
}

function getAllCustomers(storeId) {
  return readCRM(storeId, 'customers', { customers: [] }).customers;
}

function searchCustomers(storeId, query) {
  const all = getAllCustomers(storeId);
  const q   = query.toLowerCase();
  return all.filter(c =>
    c.phone?.includes(q) ||
    c.name?.toLowerCase().includes(q) ||
    c.tags?.some(t => t.toLowerCase().includes(q))
  );
}

function getSegment(storeId, segmentType) {
  const all = getAllCustomers(storeId);
  const now = Date.now();

  const segments = {
    all:         () => all,
    vip:         () => all.filter(c => c.tier === 'VIP'),
    gold:        () => all.filter(c => c.tier === 'Gold'),
    silver:      () => all.filter(c => c.tier === 'Silver'),
    new:         () => all.filter(c => (now - new Date(c.firstContact)) < 7 * 86400000),
    inactive_30: () => all.filter(c => c.lastContact && (now - new Date(c.lastContact)) > 30 * 86400000),
    inactive_7:  () => all.filter(c => c.lastContact && (now - new Date(c.lastContact)) > 7 * 86400000),
    repeat:      () => all.filter(c => c.totalOrders > 1),
    high_value:  () => all.filter(c => c.totalSpent > 10000),
    opted_in:    () => all.filter(c => c.promoOptIn !== false && c.status === 'active'),
  };

  return (segments[segmentType] || segments.all)();
}

// ── Order Recording ────────────────────────────────────────────
function recordOrder(storeId, phone, orderData) {
  let c = getCustomer(storeId, phone);
  if (!c) c = upsertCustomer(storeId, phone, { name: orderData.customerName || '' });

  const newTotal  = c.totalSpent + (orderData.amount || 0);
  const newOrders = c.totalOrders + 1;

  upsertCustomer(storeId, phone, {
    totalOrders:    newOrders,
    totalSpent:     newTotal,
    avgOrderValue:  Math.round(newTotal / newOrders),
    preferredPayment: orderData.paymentMethod || c.preferredPayment,
    preferredProducts: [...new Set([...(c.preferredProducts || []), orderData.productName].filter(Boolean))].slice(0, 5),
  });

  // Log interaction
  addInteraction(storeId, phone, {
    type:    'order',
    orderId: orderData.orderId,
    amount:  orderData.amount,
    product: orderData.productName,
    status:  'completed',
  });

  if (global.wsEvent) global.wsEvent('crm.customer_updated', { storeId, phone, tier: getTier(newTotal).tier });
}

// ── Interaction Log ────────────────────────────────────────────
function addInteraction(storeId, phone, interaction) {
  const data = readCRM(storeId, 'interactions', { interactions: [] });
  data.interactions.unshift({
    phone,
    ...interaction,
    ts: new Date().toISOString(),
  });
  if (data.interactions.length > 2000) data.interactions = data.interactions.slice(0, 2000);
  writeCRM(storeId, 'interactions', data);
}

function getCustomerInteractions(storeId, phone, limit = 20) {
  const data = readCRM(storeId, 'interactions', { interactions: [] });
  return data.interactions.filter(i => i.phone === phone).slice(0, limit);
}

// ── Notes ──────────────────────────────────────────────────────
function addNote(storeId, phone, noteText, addedBy = 'owner') {
  const c = getCustomer(storeId, phone);
  if (!c) return false;
  c.notes = c.notes || [];
  c.notes.unshift({ text: noteText, addedBy, ts: new Date().toISOString() });
  if (c.notes.length > 20) c.notes = c.notes.slice(0, 20);
  upsertCustomer(storeId, phone, { notes: c.notes });
  return true;
}

// ── Tags ───────────────────────────────────────────────────────
function addTag(storeId, phone, tag) {
  const c = getCustomer(storeId, phone);
  if (!c) return false;
  const tags = [...new Set([...(c.tags || []), tag.toLowerCase()])];
  upsertCustomer(storeId, phone, { tags });
  return true;
}

function removeTag(storeId, phone, tag) {
  const c = getCustomer(storeId, phone);
  if (!c) return false;
  upsertCustomer(storeId, phone, { tags: (c.tags || []).filter(t => t !== tag) });
  return true;
}

// ── Follow-up Scheduler ────────────────────────────────────────
function scheduleFollowUp(storeId, phone, message, scheduledAt) {
  const data = readCRM(storeId, 'followups', { followups: [] });
  const fu   = {
    id:          `fu_${Date.now()}`,
    storeId,
    phone,
    message,
    scheduledAt: scheduledAt || new Date(Date.now() + 24 * 3600000).toISOString(),
    status:      'pending',
    createdAt:   new Date().toISOString(),
  };
  data.followups.push(fu);
  writeCRM(storeId, 'followups', data);
  return fu;
}

function getDueFollowUps(storeId) {
  const data = readCRM(storeId, 'followups', { followups: [] });
  const now  = new Date().toISOString();
  return data.followups.filter(f => f.status === 'pending' && f.scheduledAt <= now);
}

function markFollowUpDone(storeId, followUpId) {
  const data = readCRM(storeId, 'followups', { followups: [] });
  const f    = data.followups.find(x => x.id === followUpId);
  if (f) { f.status = 'sent'; f.sentAt = new Date().toISOString(); }
  writeCRM(storeId, 'followups', data);
}

// ── CRM Analytics ──────────────────────────────────────────────
function getCRMStats(storeId) {
  const customers = getAllCustomers(storeId);
  const now       = Date.now();

  const byTier = customers.reduce((acc, c) => {
    acc[c.tier] = (acc[c.tier] || 0) + 1;
    return acc;
  }, {});

  const active30d = customers.filter(c => c.lastContact && (now - new Date(c.lastContact)) <= 30 * 86400000).length;
  const totalOrders = customers.reduce((s, c) => s + (c.totalOrders || 0), 0);
  const totalSpent  = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);

  return {
    totalCustomers: customers.length,
    byTier,
    activeLast30Days: active30d,
    totalOrders,
    totalSpent,
    avgOrderValue: totalOrders ? Math.round(totalSpent / totalOrders) : 0,
  };
}

module.exports = {
  upsertCustomer, getCustomer, getAllCustomers, searchCustomers, getSegment,
  recordOrder, addInteraction, getCustomerInteractions,
  addNote, addTag, removeTag,
  scheduleFollowUp, getDueFollowUps, markFollowUpDone,
  getCRMStats,
};
