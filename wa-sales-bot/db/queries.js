const { db } = require('./database');
const {
  TOOL_CATALOG,
  ACCOUNT_TYPE_CATALOG,
  findToolByInput,
  findPlanByInput,
  findAccountTypeByInput
} = require('../config/tools');
const { assertReplacementAllowed } = require('../utils/warrantyChecker');

function nowIso() {
  return new Date().toISOString();
}

function toJson(value) {
  return JSON.stringify(value || {});
}

function fromJson(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function normalizeNumber(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return digits;
}

function listTools() {
  return db.prepare('SELECT * FROM tools ORDER BY name ASC').all();
}

function listPlansForTool(toolSlug) {
  return db.prepare(`
    SELECT p.*, t.name AS tool_name, t.slug AS tool_slug
    FROM plans p
    JOIN tools t ON t.id = p.tool_id
    WHERE t.slug = ?
    ORDER BY p.display_order ASC
  `).all(toolSlug);
}

function listAccountTypes() {
  return db.prepare('SELECT * FROM account_types ORDER BY sort_order ASC, label ASC').all();
}

function getToolBySlug(toolSlug = '') {
  return db.prepare('SELECT * FROM tools WHERE slug = ?').get(toolSlug);
}

function getPlanById(planId) {
  return db.prepare(`
    SELECT p.*, t.name AS tool_name, t.slug AS tool_slug
    FROM plans p
    JOIN tools t ON t.id = p.tool_id
    WHERE p.id = ?
  `).get(planId);
}

function getAccountTypeById(typeId) {
  return db.prepare('SELECT * FROM account_types WHERE id = ?').get(typeId);
}

function getAccountTypeByName(typeName = '') {
  return db.prepare('SELECT * FROM account_types WHERE name = ?').get(String(typeName || '').trim().toLowerCase());
}

function resolvePlanReference(toolInput = '', planInput = '') {
  const tool = findToolByInput(toolInput) || TOOL_CATALOG.find(item => item.slug === toolInput) || null;
  if (!tool) return null;
  const toolRow = getToolBySlug(tool.slug);
  let plan = null;
  if (planInput) {
    plan = findPlanByInput(tool.slug, planInput) || tool.plans.find(item => item.planSlug === String(planInput || '').toLowerCase()) || null;
  }
  if (!plan) {
    plan = findPlanByInput(tool.slug, toolInput) || null;
  }
  if (!plan && tool.plans.length === 1) {
    plan = tool.plans[0];
  }
  if (!plan) return { tool, toolRow, plan: null, planRow: null };
  const planRow = db.prepare(`
    SELECT p.*, t.name AS tool_name, t.slug AS tool_slug
    FROM plans p
    JOIN tools t ON t.id = p.tool_id
    WHERE t.slug = ? AND p.plan_slug = ?
  `).get(tool.slug, plan.planSlug);
  return { tool, toolRow, plan, planRow };
}

function resolvePlanAndType(toolInput = '', planInput = '', typeInput = '') {
  const resolved = resolvePlanReference(toolInput, planInput);
  if (!resolved?.toolRow) return null;
  const accountTypeMeta = findAccountTypeByInput(typeInput) || ACCOUNT_TYPE_CATALOG.find(item => item.name === String(typeInput || '').toLowerCase());
  const accountType = accountTypeMeta ? getAccountTypeByName(accountTypeMeta.name) : null;
  return {
    ...resolved,
    accountTypeMeta,
    accountType
  };
}

function getPricingForPlanType(planId, typeId) {
  return db.prepare(`
    SELECT pr.*, at.name AS type_name, at.label AS type_label, at.policy_text, at.policy_summary,
           at.max_issue_resolutions, at.max_replacements, at.shared_login,
           p.plan_name, p.plan_slug, p.duration_days,
           t.name AS tool_name, t.slug AS tool_slug
    FROM pricing pr
    JOIN account_types at ON at.id = pr.type_id
    JOIN plans p ON p.id = pr.plan_id
    JOIN tools t ON t.id = pr.tool_id
    WHERE pr.plan_id = ? AND pr.type_id = ?
  `).get(planId, typeId);
}

function getPricingOptionsForPlan(planId) {
  return db.prepare(`
    SELECT pr.*, at.name AS type_name, at.label AS type_label, at.policy_text, at.policy_summary,
           at.max_issue_resolutions, at.max_replacements, at.shared_login,
           p.plan_name, p.plan_slug, p.duration_days,
           t.name AS tool_name, t.slug AS tool_slug
    FROM pricing pr
    JOIN account_types at ON at.id = pr.type_id
    JOIN plans p ON p.id = pr.plan_id
    JOIN tools t ON t.id = pr.tool_id
    WHERE pr.plan_id = ?
    ORDER BY at.sort_order ASC, at.label ASC
  `).all(planId);
}

function getAvailabilitySnapshot(toolSlug = '') {
  const sql = `
    SELECT
      t.id AS tool_id,
      t.name AS tool_name,
      t.slug AS tool_slug,
      p.id AS plan_id,
      p.plan_name,
      p.plan_slug,
      p.duration_days,
      at.id AS type_id,
      at.name AS type_name,
      at.label AS type_label,
      at.policy_text,
      at.policy_summary,
      at.max_issue_resolutions,
      at.max_replacements,
      at.shared_login,
      at.sort_order,
      pr.price,
      pr.is_limited_time,
      pr.limited_label,
      pr.manual_slots,
      COALESCE(SUM(CASE WHEN s.is_used = 0 THEN 1 ELSE 0 END), 0) AS actual_slots
    FROM pricing pr
    JOIN tools t ON t.id = pr.tool_id
    JOIN plans p ON p.id = pr.plan_id
    JOIN account_types at ON at.id = pr.type_id
    LEFT JOIN stock s ON s.plan_id = pr.plan_id AND s.type_id = pr.type_id AND s.is_used = 0
    ${toolSlug ? 'WHERE t.slug = ?' : ''}
    GROUP BY
      t.id, t.name, t.slug, p.id, p.plan_name, p.plan_slug, p.duration_days,
      at.id, at.name, at.label, at.policy_text, at.policy_summary, at.max_issue_resolutions, at.max_replacements, at.shared_login, at.sort_order,
      pr.id, pr.price, pr.is_limited_time, pr.limited_label, pr.manual_slots
    ORDER BY t.name ASC, p.display_order ASC, at.sort_order ASC
  `;
  const rows = toolSlug ? db.prepare(sql).all(toolSlug) : db.prepare(sql).all();
  return rows.map(row => ({
    ...row,
    price: Number(row.price || 0),
    actual_slots: Number(row.actual_slots || 0),
    manual_slots: Number(row.manual_slots || 0),
    available_slots: Math.max(Number(row.actual_slots || 0), Number(row.manual_slots || 0)),
    is_limited_time: Number(row.is_limited_time || 0) === 1,
    shared_login: Number(row.shared_login || 0) === 1
  }));
}

function getStockSummary() {
  return getAvailabilitySnapshot().map(row => ({
    tool_name: row.tool_name,
    tool_slug: row.tool_slug,
    plan_name: row.plan_name,
    plan_slug: row.plan_slug,
    type_name: row.type_name,
    type_label: row.type_label,
    available: row.available_slots,
    actual_slots: row.actual_slots,
    manual_slots: row.manual_slots,
    price: row.price
  }));
}

function updateManualSlots(toolInput = '', planInput = '', typeInput = '', qty = 0) {
  const resolved = resolvePlanAndType(toolInput, planInput, typeInput);
  if (!resolved?.planRow || !resolved?.accountType) {
    throw new Error('Tool / plan / account type resolve nahi hua');
  }
  db.prepare(`
    UPDATE pricing
    SET manual_slots = ?
    WHERE plan_id = ? AND type_id = ?
  `).run(Math.max(0, Number(qty || 0)), resolved.planRow.id, resolved.accountType.id);
  return getPricingForPlanType(resolved.planRow.id, resolved.accountType.id);
}

function saveDealerRate({ dealerNumber, dealerName = '', dealerCode = '', toolSlug, planName, planSlug = '', buyPrice, groupId = '', groupName, rawMessage, trustStatus = 'trusted' }) {
  const stmt = db.prepare(`
    INSERT INTO dealer_rates (
      dealer_number, dealer_name, dealer_code, tool_slug, plan_name, plan_slug, buy_price,
      date, group_id, group_name, message_text, raw_message, parsed_at, trust_status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, date('now', 'localtime'), ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
  `);
  return stmt.run(
    normalizeNumber(dealerNumber),
    dealerName || '',
    dealerCode || '',
    toolSlug,
    planName,
    planSlug || '',
    Number(buyPrice),
    groupId || '',
    groupName || '',
    rawMessage || '',
    rawMessage || '',
    trustStatus
  );
}

function getBestRatesForWindow(hours = 24) {
  const rows = db.prepare(`
    SELECT tool_slug, plan_name, MIN(buy_price) AS best_buy_price
    FROM dealer_rates
    WHERE created_at >= datetime('now', ?)
    GROUP BY tool_slug, plan_name
    ORDER BY tool_slug ASC, plan_name ASC
  `).all(`-${Number(hours)} hours`);

  return rows.map(row => {
    const dealer = db.prepare(`
      SELECT dealer_number, dealer_name, dealer_code, group_name, buy_price, plan_slug, trust_status, created_at
      FROM dealer_rates
      WHERE tool_slug = ? AND plan_name = ? AND buy_price = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(row.tool_slug, row.plan_name, row.best_buy_price);

    const plan = db.prepare(`
      SELECT p.id, p.tool_id, p.plan_name, t.name AS tool_name
      FROM plans p
      JOIN tools t ON t.id = p.tool_id
      WHERE t.slug = ? AND LOWER(p.plan_name) = LOWER(?)
      LIMIT 1
    `).get(row.tool_slug, row.plan_name);

    return {
      tool_slug: row.tool_slug,
      tool_name: plan?.tool_name || row.tool_slug,
      plan_name: plan?.plan_name || row.plan_name,
      plan_slug: dealer?.plan_slug || plan?.plan_slug || '',
      plan_id: plan?.id || null,
      tool_id: plan?.tool_id || null,
      best_buy_price: Number(row.best_buy_price),
      dealer_number: dealer?.dealer_number || '',
      dealer_name: dealer?.dealer_name || '',
      dealer_code: dealer?.dealer_code || '',
      trust_status: dealer?.trust_status || 'trusted',
      group_name: dealer?.group_name || '',
      latest_rate_at: dealer?.created_at || ''
    };
  });
}

function getAllTodayRates() {
  return db.prepare(`
    SELECT dealer_number, dealer_name, dealer_code, tool_slug, plan_name, plan_slug, buy_price, trust_status, group_name, created_at
    FROM dealer_rates
    WHERE date(created_at, 'localtime') = date('now', 'localtime')
    ORDER BY tool_slug ASC, plan_name ASC, buy_price ASC, created_at DESC
  `).all();
}

function getRateHistory(toolSlug, days = 30) {
  return db.prepare(`
    SELECT date(created_at, 'localtime') AS day, plan_name, MIN(buy_price) AS min_price
    FROM dealer_rates
    WHERE tool_slug = ? AND created_at >= datetime('now', ?)
    GROUP BY date(created_at, 'localtime'), plan_name
    ORDER BY day ASC
  `).all(toolSlug, `-${Number(days)} days`);
}

function upsertCustomer(number, name = '') {
  const normalized = normalizeNumber(number);
  db.prepare(`
    INSERT INTO customers (whatsapp_number, name, first_contact, last_contact)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(whatsapp_number) DO UPDATE SET
      name = COALESCE(NULLIF(excluded.name, ''), customers.name),
      last_contact = CURRENT_TIMESTAMP
  `).run(normalized, name || normalized);
  return db.prepare('SELECT * FROM customers WHERE whatsapp_number = ?').get(normalized);
}

function getCustomer(number) {
  return db.prepare('SELECT * FROM customers WHERE whatsapp_number = ?').get(normalizeNumber(number));
}

function getConversation(number) {
  const row = db.prepare('SELECT * FROM conversations WHERE customer_number = ?').get(normalizeNumber(number));
  if (!row) return null;
  return {
    ...row,
    context_data: fromJson(row.context_data)
  };
}

function upsertConversation(number, state, contextData = {}) {
  const normalized = normalizeNumber(number);
  db.prepare(`
    INSERT INTO conversations (customer_number, state, context_data, last_updated)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(customer_number) DO UPDATE SET
      state = excluded.state,
      context_data = excluded.context_data,
      last_updated = CURRENT_TIMESTAMP
  `).run(normalized, state, toJson(contextData));
  return getConversation(normalized);
}

function resetConversation(number) {
  return upsertConversation(number, 'IDLE', {});
}

function generateOrderId() {
  const seed = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `ORD-${seed}${random}`;
}

function createOrder({ customerNumber, customerName, planId, typeId, quantity = 1 }) {
  const customer = upsertCustomer(customerNumber, customerName);
  const plan = getPlanById(planId);
  const accountType = getAccountTypeById(typeId);
  const pricing = getPricingForPlanType(planId, typeId);
  if (!plan || !accountType || !pricing) {
    throw new Error('Order ke liye plan / account type missing hai');
  }
  const qty = Math.max(1, Number(quantity || 1));
  const bestRate = getBestRatesForWindow(24).find(rate =>
    rate.tool_slug === plan.tool_slug &&
    String(rate.plan_name).toLowerCase() === String(plan.plan_name).toLowerCase()
  );
  const sellPrice = Number(pricing.price || 0);
  const buyPrice = Number(bestRate?.best_buy_price || 0);
  const profit = (sellPrice - buyPrice) * qty;
  const orderId = generateOrderId();
  const renewalDate = new Date(Date.now() + Number(plan.duration_days || 30) * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO orders (
      order_id, customer_id, tool_id, plan_id, type_id, quantity, sell_price, buy_price, profit, status, order_date, renewal_date, policy_snapshot
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', CURRENT_TIMESTAMP, ?, ?)
  `).run(
    orderId,
    customer.id,
    plan.tool_id,
    plan.id,
    accountType.id,
    qty,
    sellPrice,
    buyPrice,
    profit,
    renewalDate,
    pricing.policy_summary || accountType.policy_text || ''
  );

  return getOrderByOrderId(orderId);
}

function getOrderByOrderId(orderId) {
  return db.prepare(`
    SELECT
      o.*,
      c.whatsapp_number,
      c.name AS customer_name,
      t.name AS tool_name,
      t.slug AS tool_slug,
      p.plan_name,
      p.plan_slug,
      p.duration_days,
      at.name AS type_name,
      at.label AS type_label,
      at.policy_text AS type_policy_text,
      at.policy_summary AS type_policy_summary,
      at.max_issue_resolutions,
      at.max_replacements,
      at.shared_login
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN tools t ON t.id = o.tool_id
    JOIN plans p ON p.id = o.plan_id
    LEFT JOIN account_types at ON at.id = o.type_id
    WHERE o.order_id = ?
  `).get(orderId);
}

function getLatestOrderForCustomer(number) {
  return db.prepare(`
    SELECT
      o.*,
      c.whatsapp_number,
      c.name AS customer_name,
      t.name AS tool_name,
      t.slug AS tool_slug,
      p.plan_name,
      p.plan_slug,
      p.duration_days,
      at.name AS type_name,
      at.label AS type_label,
      at.policy_text AS type_policy_text,
      at.policy_summary AS type_policy_summary,
      at.max_issue_resolutions,
      at.max_replacements,
      at.shared_login
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN tools t ON t.id = o.tool_id
    JOIN plans p ON p.id = o.plan_id
    LEFT JOIN account_types at ON at.id = o.type_id
    WHERE c.whatsapp_number = ?
    ORDER BY o.order_date DESC
    LIMIT 1
  `).get(normalizeNumber(number));
}

function attachPaymentScreenshot(orderId, filePath) {
  db.prepare(`
    UPDATE orders
    SET payment_screenshot = ?, status = 'awaiting_verification'
    WHERE order_id = ?
  `).run(filePath, orderId);
  return getOrderByOrderId(orderId);
}

function getUnusedStockForPlan(planId, typeId, quantity = 1) {
  return db.prepare(`
    SELECT s.*, t.name AS tool_name, p.plan_name, at.name AS type_name, at.label AS type_label
    FROM stock s
    JOIN tools t ON t.id = s.tool_id
    JOIN plans p ON p.id = s.plan_id
    LEFT JOIN account_types at ON at.id = s.type_id
    WHERE s.plan_id = ? AND s.type_id = ? AND s.is_used = 0
    ORDER BY s.added_date ASC
    LIMIT ?
  `).all(planId, typeId, Math.max(1, Number(quantity || 1)));
}

function addStockEntry({ toolInput, planInput, typeInput, keyValue, accountEmail, accountPass, extraInfo }) {
  const resolved = resolvePlanAndType(toolInput, planInput, typeInput);
  if (!resolved?.planRow || !resolved?.accountType) {
    throw new Error('Tool / plan / account type resolve nahi hua');
  }
  const credentialsJson = JSON.stringify({
    keyValue: keyValue || '',
    accountEmail: accountEmail || '',
    accountPass: accountPass || '',
    extraInfo: extraInfo || ''
  });
  db.prepare(`
    INSERT INTO stock (
      tool_id, plan_id, type_id, key_value, account_email, account_pass, extra_info, credentials_json, is_used, added_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
  `).run(
    resolved.planRow.tool_id,
    resolved.planRow.id,
    resolved.accountType.id,
    keyValue || '',
    accountEmail || '',
    accountPass || '',
    extraInfo || '',
    credentialsJson
  );
  return {
    tool: resolved.tool,
    plan: resolved.planRow,
    accountType: resolved.accountType
  };
}

function addNotifyMe({ customerNumber, customerName = '', toolSlug, planSlug, accountType }) {
  const normalized = normalizeNumber(customerNumber);
  if (!normalized || !toolSlug || !planSlug || !accountType) {
    throw new Error('Notify-me ke liye customer, tool, plan aur account type required hain');
  }
  upsertCustomer(normalized, customerName || normalized);
  db.prepare(`
    INSERT INTO notify_me (customer_number, customer_name, tool_slug, plan_slug, account_type, requested_at, status)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'waiting')
    ON CONFLICT(customer_number, tool_slug, plan_slug, account_type, status) DO UPDATE SET
      customer_name = COALESCE(NULLIF(excluded.customer_name, ''), notify_me.customer_name),
      requested_at = CURRENT_TIMESTAMP
  `).run(
    normalized,
    customerName || '',
    String(toolSlug || '').toLowerCase(),
    String(planSlug || '').toLowerCase(),
    String(accountType || '').toLowerCase()
  );
  return db.prepare(`
    SELECT *
    FROM notify_me
    WHERE customer_number = ? AND tool_slug = ? AND plan_slug = ? AND account_type = ? AND status = 'waiting'
  `).get(normalized, String(toolSlug || '').toLowerCase(), String(planSlug || '').toLowerCase(), String(accountType || '').toLowerCase());
}

function getWaitingNotifyMe(toolSlug = '', planSlug = '', accountType = '') {
  return db.prepare(`
    SELECT *
    FROM notify_me
    WHERE status = 'waiting'
      AND tool_slug = ?
      AND plan_slug = ?
      AND account_type = ?
    ORDER BY requested_at ASC
  `).all(
    String(toolSlug || '').toLowerCase(),
    String(planSlug || '').toLowerCase(),
    String(accountType || '').toLowerCase()
  );
}

function markNotifyMeSent(ids = []) {
  const cleanIds = (Array.isArray(ids) ? ids : [ids]).map(Number).filter(Boolean);
  if (!cleanIds.length) return 0;
  const stmt = db.prepare(`
    UPDATE notify_me
    SET status = 'notified', notified_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const tx = db.transaction(items => {
    items.forEach(id => stmt.run(id));
  });
  tx(cleanIds);
  return cleanIds.length;
}

function approveOrder(orderId) {
  const order = getOrderByOrderId(orderId);
  if (!order) throw new Error('Order not found');
  if (order.status === 'delivered') return { order, stocks: [], alreadyDelivered: true };

  const stocks = getUnusedStockForPlan(order.plan_id, order.type_id, order.quantity);
  if (stocks.length < Number(order.quantity || 1)) {
    throw new Error('Is order ke liye enough credentials / slots configured nahi hain');
  }

  const deliveredAt = nowIso();
  db.transaction(() => {
    const markStock = db.prepare(`
      UPDATE stock
      SET is_used = 1, used_order_id = ?, used_at = ?
      WHERE id = ?
    `);

    stocks.forEach(stock => {
      markStock.run(order.order_id, deliveredAt, stock.id);
    });

    db.prepare(`
      UPDATE orders
      SET status = 'delivered', payment_verified_at = ?, delivery_date = ?
      WHERE order_id = ?
    `).run(deliveredAt, deliveredAt, order.order_id);

    db.prepare(`
      UPDATE customers
      SET total_orders = total_orders + ?, total_spent = total_spent + ?, last_contact = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(Number(order.quantity || 1), Number(order.sell_price) * Number(order.quantity || 1), order.customer_id);

    db.prepare(`
      UPDATE pricing
      SET manual_slots = CASE
        WHEN manual_slots > ? THEN manual_slots - ?
        ELSE 0
      END
      WHERE plan_id = ? AND type_id = ?
    `).run(Number(order.quantity || 1), Number(order.quantity || 1), order.plan_id, order.type_id);
  })();

  return {
    order: getOrderByOrderId(orderId),
    stocks,
    alreadyDelivered: false
  };
}

function markFollowupSent(orderId, field) {
  const allowed = ['day1_followup_at', 'review_requested_at', 'day25_reminder_at', 'day28_urgency_at'];
  if (!allowed.includes(field)) return;
  db.prepare(`UPDATE orders SET ${field} = CURRENT_TIMESTAMP WHERE order_id = ?`).run(orderId);
}

function getOrdersForFollowup() {
  return db.prepare(`
    SELECT
      o.*,
      c.whatsapp_number,
      c.name AS customer_name,
      t.name AS tool_name,
      t.slug AS tool_slug,
      p.plan_name,
      p.plan_slug,
      p.sell_price,
      at.name AS type_name,
      at.label AS type_label,
      at.max_issue_resolutions,
      at.max_replacements
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN tools t ON t.id = o.tool_id
    JOIN plans p ON p.id = o.plan_id
    LEFT JOIN account_types at ON at.id = o.type_id
    WHERE o.status = 'delivered'
  `).all();
}

function getPendingOrdersToday() {
  return db.prepare(`
    SELECT
      o.order_id,
      c.name AS customer_name,
      c.whatsapp_number,
      t.name AS tool_name,
      p.plan_name,
      at.label AS type_label,
      o.status,
      o.order_date
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN tools t ON t.id = o.tool_id
    JOIN plans p ON p.id = o.plan_id
    LEFT JOIN account_types at ON at.id = o.type_id
    WHERE date(o.order_date, 'localtime') = date('now', 'localtime')
      AND o.status IN ('awaiting_payment', 'awaiting_verification')
    ORDER BY o.order_date DESC
  `).all();
}

function getTodaySalesStats() {
  const summary = db.prepare(`
    SELECT COUNT(*) AS orders_count,
           COALESCE(SUM(quantity * sell_price), 0) AS revenue,
           COALESCE(SUM(profit), 0) AS profit
    FROM orders
    WHERE date(order_date, 'localtime') = date('now', 'localtime')
      AND status = 'delivered'
  `).get();
  const topTools = db.prepare(`
    SELECT t.name AS tool_name, SUM(o.quantity) AS quantity
    FROM orders o
    JOIN tools t ON t.id = o.tool_id
    WHERE date(o.order_date, 'localtime') = date('now', 'localtime')
    GROUP BY t.name
    ORDER BY quantity DESC
    LIMIT 5
  `).all();
  return { ...summary, topTools };
}

function saveBroadcast({ message, targetGroups, scheduledTime, status = 'scheduled', sentAt = null }) {
  const result = db.prepare(`
    INSERT INTO broadcasts (message, target_groups, scheduled_time, sent_at, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(message, JSON.stringify(targetGroups || []), scheduledTime || null, sentAt || null, status);
  return db.prepare(`SELECT * FROM broadcasts WHERE id = ?`).get(result.lastInsertRowid);
}

function createIssue({ orderId, description, aiNotes = '' }) {
  const order = getOrderByOrderId(orderId);
  if (!order) throw new Error('Order not found');
  const result = db.prepare(`
    INSERT INTO issues (order_row_id, order_id, description, status, ai_notes, created_at)
    VALUES (?, ?, ?, 'open', ?, CURRENT_TIMESTAMP)
  `).run(order.id, order.order_id, description, aiNotes);
  return db.prepare(`
    SELECT * FROM issues WHERE id = ?
  `).get(result.lastInsertRowid);
}

function getIssueHistory(orderId) {
  return db.prepare(`
    SELECT i.*, o.order_id, t.name AS tool_name, p.plan_name, at.label AS type_label
    FROM issues i
    JOIN orders o ON o.id = i.order_row_id
    JOIN tools t ON t.id = o.tool_id
    JOIN plans p ON p.id = o.plan_id
    LEFT JOIN account_types at ON at.id = o.type_id
    WHERE i.order_id = ?
    ORDER BY i.created_at DESC
  `).all(orderId);
}

function getLatestOpenIssue(orderId) {
  return db.prepare(`
    SELECT * FROM issues
    WHERE order_id = ? AND status IN ('open', 'triaged')
    ORDER BY created_at DESC
    LIMIT 1
  `).get(orderId);
}

function resolveIssue(orderId, resolution = 'Resolved by admin') {
  const issue = getLatestOpenIssue(orderId);
  if (!issue) throw new Error('Open issue nahi mili');
  const order = getOrderByOrderId(orderId);
  if (!order) throw new Error('Order not found');
  db.transaction(() => {
    db.prepare(`
      UPDATE issues
      SET status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(resolution, issue.id);

    if (order.type_name === 'warranty') {
      db.prepare(`
        UPDATE orders
        SET warranty_issues_resolved = warranty_issues_resolved + 1
        WHERE order_id = ?
      `).run(orderId);
    }
  })();
  return getOrderByOrderId(orderId);
}

function flagScammer(number, reason) {
  const normalized = normalizeNumber(number);
  db.prepare(`
    INSERT INTO scammers (number, reason, added_date)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(number) DO UPDATE SET reason = excluded.reason, added_date = CURRENT_TIMESTAMP
  `).run(normalized, reason || 'Flagged by admin');
  db.prepare(`
    UPDATE customers
    SET is_blocked = 1, is_scammer = 1
    WHERE whatsapp_number = ?
  `).run(normalized);
}

function isScammer(number) {
  return Boolean(db.prepare('SELECT id FROM scammers WHERE number = ?').get(normalizeNumber(number)));
}

function rejectOrder(orderId, reason = 'Payment rejected by admin') {
  db.prepare(`
    UPDATE orders
    SET status = 'cancelled', notes = COALESCE(notes || char(10), '') || ?
    WHERE order_id = ?
  `).run(`Rejected: ${reason}`, String(orderId || '').toUpperCase());
  return getOrderByOrderId(String(orderId || '').toUpperCase());
}

function replaceOrderStock(orderId) {
  const order = getOrderByOrderId(String(orderId || '').toUpperCase());
  if (!order) throw new Error('Order not found');
  assertReplacementAllowed(order);
  const stocks = getUnusedStockForPlan(order.plan_id, order.type_id, 1);
  if (!stocks.length) throw new Error('Replacement ke liye stock key available nahi');
  const stock = stocks[0];
  const replacedAt = nowIso();
  db.transaction(() => {
    db.prepare(`
      UPDATE stock
      SET is_used = 1, used_order_id = ?, used_at = ?
      WHERE id = ?
    `).run(`${order.order_id}-REPLACE`, replacedAt, stock.id);
    db.prepare(`
      UPDATE orders
      SET warranty_replacements_used = warranty_replacements_used + 1,
          notes = COALESCE(notes || char(10), '') || ?
      WHERE order_id = ?
    `).run(`Replacement sent at ${replacedAt}`, order.order_id);
  })();
  return { order: getOrderByOrderId(order.order_id), stocks: [stock] };
}

function updatePricing(toolInput = '', typeInput = '', price = 0) {
  const resolved = resolvePlanAndType(toolInput, '', typeInput);
  if (!resolved?.planRow || !resolved?.accountType) {
    throw new Error('Tool / plan / account type resolve nahi hua');
  }
  db.prepare(`
    UPDATE pricing
    SET price = ?
    WHERE plan_id = ? AND type_id = ?
  `).run(Number(price || 0), resolved.planRow.id, resolved.accountType.id);
  return getPricingForPlanType(resolved.planRow.id, resolved.accountType.id);
}

function toggleLimitedBadge(toolInput = '', typeInput = '', enabled = true) {
  const resolved = resolvePlanAndType(toolInput, '', typeInput);
  if (!resolved?.planRow || !resolved?.accountType) {
    throw new Error('Tool / plan / account type resolve nahi hua');
  }
  db.prepare(`
    UPDATE pricing
    SET is_limited_time = ?, limited_label = CASE WHEN ? = 1 THEN COALESCE(NULLIF(limited_label, ''), 'LIMITED TIME') ELSE '' END
    WHERE plan_id = ? AND type_id = ?
  `).run(enabled ? 1 : 0, enabled ? 1 : 0, resolved.planRow.id, resolved.accountType.id);
  return getPricingForPlanType(resolved.planRow.id, resolved.accountType.id);
}

function getCustomerProfile(number) {
  const customer = getCustomer(number);
  if (!customer) return null;
  const orders = db.prepare(`
    SELECT
      o.order_id, o.status, o.sell_price, o.quantity, o.profit, o.order_date, o.delivery_date,
      t.name AS tool_name, p.plan_name, at.label AS type_label,
      o.warranty_replacements_used, o.warranty_issues_resolved
    FROM orders o
    JOIN tools t ON t.id = o.tool_id
    JOIN plans p ON p.id = o.plan_id
    LEFT JOIN account_types at ON at.id = o.type_id
    WHERE o.customer_id = ?
    ORDER BY o.order_date DESC
    LIMIT 10
  `).all(customer.id);
  return { ...customer, orders };
}

module.exports = {
  normalizeNumber,
  listTools,
  listPlansForTool,
  listAccountTypes,
  getPlanById,
  getAccountTypeById,
  getAccountTypeByName,
  getPricingForPlanType,
  getPricingOptionsForPlan,
  getAvailabilitySnapshot,
  getStockSummary,
  updateManualSlots,
  saveDealerRate,
  getBestRatesForWindow,
  getAllTodayRates,
  getRateHistory,
  upsertCustomer,
  getCustomer,
  getConversation,
  upsertConversation,
  resetConversation,
  createOrder,
  getOrderByOrderId,
  getLatestOrderForCustomer,
  attachPaymentScreenshot,
  addStockEntry,
  addNotifyMe,
  getWaitingNotifyMe,
  markNotifyMeSent,
  approveOrder,
  rejectOrder,
  replaceOrderStock,
  updatePricing,
  toggleLimitedBadge,
  getCustomerProfile,
  markFollowupSent,
  getOrdersForFollowup,
  getPendingOrdersToday,
  getTodaySalesStats,
  saveBroadcast,
  createIssue,
  getIssueHistory,
  resolveIssue,
  flagScammer,
  isScammer,
  resolvePlanReference,
  resolvePlanAndType
};
