const { db } = require('../../db/database');
const queries = require('../../db/queries');
const trustManager = require('./trustManager');

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function resolveStockReference(toolInput = '', typeInput = '') {
  const parts = String(toolInput || '').trim().split(/\s+/);
  const planInput = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const resolved = queries.resolvePlanAndType(toolInput, planInput, typeInput);
  if (!resolved?.toolRow || !resolved?.planRow || !resolved?.accountType) {
    throw new Error('Tool / plan / type resolve nahi hua');
  }
  return resolved;
}

function syncPricingSlots(planId, typeId, quantityAvailable) {
  db.prepare(`
    UPDATE pricing
    SET manual_slots = ?
    WHERE plan_id = ? AND type_id = ?
  `).run(Math.max(0, Number(quantityAvailable || 0)), planId, typeId);
}

function getStockInventoryRow(toolSlug, planSlug, accountType) {
  return db.prepare(`
    SELECT *
    FROM stock_inventory
    WHERE tool_slug = ? AND plan_slug = ? AND account_type = ?
  `).get(toolSlug, planSlug, accountType);
}

function upsertStockInventory({
  toolSlug,
  planSlug,
  accountType,
  quantityDelta = 0,
  quantityTotalDelta = 0,
  primaryDealerCode = '',
  backupDealerCode = '',
  lowStockThreshold = 3,
  autoReorder = false,
  lastRestockedBy = ''
}) {
  const existing = getStockInventoryRow(toolSlug, planSlug, accountType);
  if (!existing) {
    db.prepare(`
      INSERT INTO stock_inventory (
        tool_slug, plan_slug, account_type, quantity_available, quantity_total,
        primary_dealer_code, backup_dealer_code, last_restocked_date, last_restocked_by,
        low_stock_threshold, auto_reorder
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      toolSlug,
      planSlug,
      accountType,
      Math.max(0, Number(quantityDelta || 0)),
      Math.max(0, Number(quantityTotalDelta || quantityDelta || 0)),
      primaryDealerCode || '',
      backupDealerCode || '',
      nowIso(),
      lastRestockedBy || '',
      Math.max(1, Number(lowStockThreshold || 3)),
      autoReorder ? 1 : 0
    );
  } else {
    db.prepare(`
      UPDATE stock_inventory
      SET quantity_available = MAX(0, quantity_available + ?),
          quantity_total = MAX(quantity_total + ?, quantity_available + ?),
          primary_dealer_code = COALESCE(NULLIF(?, ''), primary_dealer_code),
          backup_dealer_code = COALESCE(NULLIF(?, ''), backup_dealer_code),
          last_restocked_date = ?,
          last_restocked_by = COALESCE(NULLIF(?, ''), last_restocked_by),
          low_stock_threshold = ?,
          auto_reorder = ?
      WHERE id = ?
    `).run(
      Number(quantityDelta || 0),
      Number(quantityTotalDelta || quantityDelta || 0),
      Number(quantityDelta || 0),
      primaryDealerCode || '',
      backupDealerCode || '',
      nowIso(),
      lastRestockedBy || '',
      Math.max(1, Number(lowStockThreshold || existing.low_stock_threshold || 3)),
      autoReorder ? 1 : Number(existing.auto_reorder || 0),
      existing.id
    );
  }
  return getStockInventoryRow(toolSlug, planSlug, accountType);
}

function addStockQuantity(toolInput = '', typeInput = '', dealerCode = '', qty = 0) {
  const resolved = resolveStockReference(toolInput, typeInput);
  const quantity = Math.max(0, Number(qty || 0));
  const inventory = upsertStockInventory({
    toolSlug: resolved.tool.slug,
    planSlug: resolved.plan.planSlug,
    accountType: resolved.accountType.name,
    quantityDelta: quantity,
    quantityTotalDelta: quantity,
    primaryDealerCode: String(dealerCode || '').trim().toUpperCase(),
    lastRestockedBy: dealerCode || 'manual'
  });
  syncPricingSlots(resolved.planRow.id, resolved.accountType.id, inventory.quantity_available);
  return { resolved, inventory };
}

async function notifyWaitingCustomers(runtime, inventory = {}, resolved = null) {
  if (!runtime || !inventory?.tool_slug || !inventory?.plan_slug || !inventory?.account_type) {
    return [];
  }
  const waiting = queries.getWaitingNotifyMe(inventory.tool_slug, inventory.plan_slug, inventory.account_type);
  if (!waiting.length || Number(inventory.quantity_available || 0) <= 0) return [];

  const title = resolved
    ? `${resolved.tool.name} ${resolved.plan.planName} — ${resolved.accountType.label}`
    : `${inventory.tool_slug} ${inventory.plan_slug} — ${inventory.account_type}`;
  const message = `✅ *Back in Stock*\n━━━━━━━━━━━━━━━━━━━━\n\n${title} ab available hai.\nSlots: *${inventory.quantity_available}*\n\nOrder karne ke liye reply karein: *order ${inventory.tool_slug}*`;
  const notified = [];
  for (const row of waiting) {
    try {
      await runtime.sendText(`${row.customer_number}@s.whatsapp.net`, message);
      notified.push(row.id);
    } catch {
      // Keep notifying the remaining waiting customers.
    }
  }
  queries.markNotifyMeSent(notified);
  return waiting.filter(row => notified.includes(row.id));
}

function addStockKey({
  toolInput,
  typeInput,
  dealerCode = '',
  keyValue = '',
  accountEmail = '',
  accountPass = '',
  extraInfo = '',
  expiryDate = null
}) {
  const resolved = resolveStockReference(toolInput, typeInput);
  const normalizedDealerCode = String(dealerCode || '').trim().toUpperCase();
  const credentialsJson = JSON.stringify({
    keyValue: keyValue || '',
    accountEmail: accountEmail || '',
    accountPass: accountPass || '',
    extraInfo: extraInfo || ''
  });

  db.prepare(`
    INSERT INTO stock_keys (
      tool_slug, plan_slug, account_type, credentials_json, dealer_code, is_used, used_by_order_id, added_date, expiry_date
    )
    VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)
  `).run(
    resolved.tool.slug,
    resolved.plan.planSlug,
    resolved.accountType.name,
    credentialsJson,
    normalizedDealerCode,
    nowIso(),
    expiryDate || null
  );

  queries.addStockEntry({
    toolInput,
    planInput: '',
    typeInput,
    keyValue,
    accountEmail,
    accountPass,
    extraInfo
  });

  const inventory = upsertStockInventory({
    toolSlug: resolved.tool.slug,
    planSlug: resolved.plan.planSlug,
    accountType: resolved.accountType.name,
    quantityDelta: 1,
    quantityTotalDelta: 1,
    primaryDealerCode: normalizedDealerCode,
    lastRestockedBy: normalizedDealerCode || 'manual'
  });
  syncPricingSlots(resolved.planRow.id, resolved.accountType.id, inventory.quantity_available);
  return { resolved, inventory };
}

function getInventoryMatrix() {
  const rows = db.prepare(`
    SELECT *
    FROM stock_inventory
    ORDER BY tool_slug ASC, plan_slug ASC, account_type ASC
  `).all();

  const grouped = new Map();
  rows.forEach(row => {
    const key = `${row.tool_slug}:${row.plan_slug}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        tool_slug: row.tool_slug,
        plan_slug: row.plan_slug,
        private: 0,
        warranty: 0,
        non_warranty: 0,
        primary_dealer_code: row.primary_dealer_code || '',
        backup_dealer_code: row.backup_dealer_code || ''
      });
    }
    grouped.get(key)[row.account_type] = Number(row.quantity_available || 0);
    if (row.primary_dealer_code) grouped.get(key).primary_dealer_code = row.primary_dealer_code;
    if (row.backup_dealer_code) grouped.get(key).backup_dealer_code = row.backup_dealer_code;
  });
  return [...grouped.values()];
}

function getToolInventory(toolSlug = '') {
  const normalized = normalizeText(toolSlug);
  return db.prepare(`
    SELECT *
    FROM stock_inventory
    WHERE tool_slug = ?
    ORDER BY plan_slug ASC, account_type ASC
  `).all(normalized);
}

function consumeDeliveredOrder(order = {}, deliveredStocks = []) {
  const toolSlug = normalizeText(order.tool_slug || '');
  const planSlug = normalizeText(order.plan_slug || '');
  const accountType = normalizeText(order.type_name || '');
  if (!toolSlug || !planSlug || !accountType) return null;

  const inventory = getStockInventoryRow(toolSlug, planSlug, accountType);
  if (inventory) {
    const nextQty = Math.max(0, Number(inventory.quantity_available || 0) - Number(order.quantity || deliveredStocks.length || 1));
    db.prepare(`
      UPDATE stock_inventory
      SET quantity_available = ?, last_restocked_date = ?
      WHERE id = ?
    `).run(nextQty, nowIso(), inventory.id);
    syncPricingSlots(order.plan_id, order.type_id, nextQty);
  }

  const matchingKeys = db.prepare(`
    SELECT *
    FROM stock_keys
    WHERE tool_slug = ? AND plan_slug = ? AND account_type = ? AND is_used = 0
    ORDER BY added_date ASC
    LIMIT ?
  `).all(toolSlug, planSlug, accountType, Math.max(1, Number(order.quantity || deliveredStocks.length || 1)));

  matchingKeys.forEach(row => {
    db.prepare(`
      UPDATE stock_keys
      SET is_used = 1, used_by_order_id = ?
      WHERE id = ?
    `).run(order.order_id, row.id);
    if (row.dealer_code) trustManager.markTrustedDealerOrder(row.dealer_code);
  });

  return getStockInventoryRow(toolSlug, planSlug, accountType);
}

function getLowStockRows(defaultThreshold = 3) {
  return db.prepare(`
    SELECT *
    FROM stock_inventory
    WHERE quantity_available <= COALESCE(NULLIF(low_stock_threshold, 0), ?)
    ORDER BY quantity_available ASC, tool_slug ASC
  `).all(Math.max(1, Number(defaultThreshold || 3)));
}

async function sendRestockRequest(runtime, dealerCode, toolSlug, planSlug, accountType, quantityAvailable) {
  const dealer = trustManager.getTrustedDealerByCode(dealerCode);
  if (!dealer) throw new Error('Dealer code not found');
  const jid = `${dealer.dealer_number}@s.whatsapp.net`;
  const message = `السلام علیکم ${dealer.dealer_name || dealer.dealer_code}!\n` +
    `${toolSlug} ${planSlug} (${accountType}) stock کم ہو رہی ہے۔\n` +
    `ابھی available: ${quantityAvailable}\n` +
    `کیا آپ کے پاس اور available ہے؟\nPrice کیا ہوگی؟`;
  await runtime.sendText(jid, message);
  return { dealer, message };
}

async function requestRestock(runtime, toolInput = '', typeInput = '', dealerCode = '') {
  const resolved = resolveStockReference(toolInput, typeInput);
  const inventory = getStockInventoryRow(resolved.tool.slug, resolved.plan.planSlug, resolved.accountType.name);
  return sendRestockRequest(
    runtime,
    dealerCode,
    resolved.tool.slug,
    resolved.plan.planSlug,
    resolved.accountType.name,
    Number(inventory?.quantity_available || 0)
  );
}

async function autoRestockAlerts(runtime, defaultThreshold = 3) {
  const rows = getLowStockRows(defaultThreshold);
  const alerted = [];
  for (const row of rows) {
    if (!row.primary_dealer_code) continue;
    try {
      await sendRestockRequest(runtime, row.primary_dealer_code, row.tool_slug, row.plan_slug, row.account_type, row.quantity_available);
      alerted.push(row);
    } catch (error) {
      // keep moving
    }
  }
  return alerted;
}

function getDealerSuppliedStock(dealerCode = '') {
  const code = String(dealerCode || '').trim().toUpperCase();
  return db.prepare(`
    SELECT *
    FROM stock_keys
    WHERE dealer_code = ?
    ORDER BY added_date DESC
  `).all(code);
}

module.exports = {
  addStockQuantity,
  addStockKey,
  notifyWaitingCustomers,
  getInventoryMatrix,
  getToolInventory,
  consumeDeliveredOrder,
  getLowStockRows,
  sendRestockRequest,
  requestRestock,
  autoRestockAlerts,
  getDealerSuppliedStock
};
