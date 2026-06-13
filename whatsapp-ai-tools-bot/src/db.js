const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dealers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      whatsapp_number TEXT UNIQUE NOT NULL,
      group_id TEXT,
      group_name TEXT,
      reliability_score INTEGER DEFAULT 70,
      priority INTEGER DEFAULT 0,
      is_scammer INTEGER DEFAULT 0,
      scam_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_id INTEGER,
      dealer_number TEXT NOT NULL,
      group_id TEXT,
      group_name TEXT,
      tool_name TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      buy_price REAL NOT NULL,
      raw_message TEXT,
      message_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      whatsapp_number TEXT UNIQUE NOT NULL,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
      last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_number TEXT NOT NULL,
      customer_name TEXT,
      tool_name TEXT NOT NULL,
      plan_name TEXT DEFAULT 'Default',
      qty INTEGER DEFAULT 1,
      sell_price REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      qty INTEGER DEFAULT 0,
      threshold INTEGER DEFAULT ${Number(config.lowStockThreshold)},
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tool_name, plan_name)
    );

    CREATE TABLE IF NOT EXISTS scammers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whatsapp_number TEXT UNIQUE NOT NULL,
      notes TEXT,
      flagged_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT UNIQUE NOT NULL,
      group_name TEXT,
      group_type TEXT DEFAULT 'customer',
      monitor_rates INTEGER DEFAULT 0,
      broadcast_enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_rates_tool_plan_time ON rates(tool_name, plan_name, created_at);
    CREATE INDEX IF NOT EXISTS idx_rates_dealer_time ON rates(dealer_number, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_time ON orders(created_at);
  `);
}

function upsertDealer({ number, name, groupId, groupName }) {
  const existing = db.prepare('SELECT * FROM dealers WHERE whatsapp_number = ?').get(number);
  if (existing) {
    db.prepare(`
      UPDATE dealers
      SET name = COALESCE(?, name), group_id = COALESCE(?, group_id), group_name = COALESCE(?, group_name), updated_at = CURRENT_TIMESTAMP
      WHERE whatsapp_number = ?
    `).run(name || null, groupId || null, groupName || null, number);
    return db.prepare('SELECT * FROM dealers WHERE whatsapp_number = ?').get(number);
  }
  const info = db.prepare(`
    INSERT INTO dealers (name, whatsapp_number, group_id, group_name)
    VALUES (?, ?, ?, ?)
  `).run(name || number, number, groupId || null, groupName || null);
  return db.prepare('SELECT * FROM dealers WHERE id = ?').get(info.lastInsertRowid);
}

function saveRate({ dealer, dealerNumber, groupId, groupName, toolName, planName, buyPrice, rawMessage, messageId }) {
  return db.prepare(`
    INSERT INTO rates (dealer_id, dealer_number, group_id, group_name, tool_name, plan_name, buy_price, raw_message, message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(dealer?.id || null, dealerNumber, groupId || null, groupName || null, toolName, planName, buyPrice, rawMessage || null, messageId || null);
}

function getTodayRates() {
  return db.prepare(`
    SELECT r.*, d.name AS dealer_name, d.priority, d.is_scammer
    FROM rates r
    LEFT JOIN dealers d ON d.id = r.dealer_id
    WHERE date(r.created_at, 'localtime') = date('now', 'localtime')
    ORDER BY r.tool_name, r.plan_name, r.buy_price ASC
  `).all();
}

function getLast24hRates() {
  return db.prepare(`
    SELECT r.*, d.name AS dealer_name, d.priority, d.is_scammer
    FROM rates r
    LEFT JOIN dealers d ON d.id = r.dealer_id
    WHERE r.created_at >= datetime('now', '-24 hours')
    ORDER BY r.tool_name, r.plan_name, r.buy_price ASC
  `).all();
}

function getCheapestRates(hours = 24) {
  const rows = db.prepare(`
    SELECT r.*, d.name AS dealer_name, d.priority, d.is_scammer
    FROM rates r
    LEFT JOIN dealers d ON d.id = r.dealer_id
    WHERE r.created_at >= datetime('now', ?)
      AND COALESCE(d.is_scammer, 0) = 0
    ORDER BY r.tool_name, r.plan_name, r.buy_price ASC
  `).all(`-${Number(hours)} hours`);
  const map = new Map();
  for (const row of rows) {
    const key = `${row.tool_name}__${row.plan_name}`;
    if (!map.has(key) || row.buy_price < map.get(key).buy_price) map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => a.tool_name.localeCompare(b.tool_name) || a.buy_price - b.buy_price);
}

function upsertCustomer({ number, name }) {
  const existing = db.prepare('SELECT * FROM customers WHERE whatsapp_number = ?').get(number);
  if (existing) {
    db.prepare('UPDATE customers SET name = COALESCE(?, name), last_seen = CURRENT_TIMESTAMP WHERE whatsapp_number = ?').run(name || null, number);
    return db.prepare('SELECT * FROM customers WHERE whatsapp_number = ?').get(number);
  }
  const info = db.prepare('INSERT INTO customers (name, whatsapp_number) VALUES (?, ?)').run(name || number, number);
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
}

function createOrder({ customer, number, name, toolName, planName = 'Default', qty = 1, sellPrice = 0 }) {
  const info = db.prepare(`
    INSERT INTO orders (customer_id, customer_number, customer_name, tool_name, plan_name, qty, sell_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(customer?.id || null, number, name || customer?.name || number, toolName, planName, Number(qty), Number(sellPrice));
  db.prepare(`
    UPDATE customers
    SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_seen = CURRENT_TIMESTAMP
    WHERE whatsapp_number = ?
  `).run(Number(qty) * Number(sellPrice), number);
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
}

function updateStock(toolName, planName, qty) {
  db.prepare(`
    INSERT INTO stock (tool_name, plan_name, qty)
    VALUES (?, ?, ?)
    ON CONFLICT(tool_name, plan_name) DO UPDATE SET qty = excluded.qty, updated_at = CURRENT_TIMESTAMP
  `).run(toolName, planName || 'Default', Number(qty));
  return db.prepare('SELECT * FROM stock WHERE tool_name = ? AND plan_name = ?').get(toolName, planName || 'Default');
}

function adjustStockDelta(toolName, planName, delta) {
  const current = db.prepare('SELECT * FROM stock WHERE tool_name = ? AND plan_name = ?').get(toolName, planName || 'Default');
  const nextQty = Number(current?.qty || 0) + Number(delta || 0);
  db.prepare(`
    INSERT INTO stock (tool_name, plan_name, qty)
    VALUES (?, ?, ?)
    ON CONFLICT(tool_name, plan_name) DO UPDATE SET qty = excluded.qty, updated_at = CURRENT_TIMESTAMP
  `).run(toolName, planName || 'Default', nextQty);
  return db.prepare('SELECT * FROM stock WHERE tool_name = ? AND plan_name = ?').get(toolName, planName || 'Default');
}

function getStock() {
  return db.prepare('SELECT * FROM stock ORDER BY qty ASC, tool_name ASC').all();
}

function getLowStockRows() {
  return getStock().filter(row => Number(row.qty) < Number(row.threshold));
}

function flagScammer(number, notes = '') {
  db.prepare(`
    INSERT INTO scammers (whatsapp_number, notes)
    VALUES (?, ?)
    ON CONFLICT(whatsapp_number) DO UPDATE SET notes = excluded.notes, flagged_at = CURRENT_TIMESTAMP
  `).run(number, notes);
  db.prepare('UPDATE dealers SET is_scammer = 1, scam_notes = ? WHERE whatsapp_number = ?').run(notes || 'Flagged by admin', number);
}

function isScammer(number) {
  return Boolean(db.prepare('SELECT id FROM scammers WHERE whatsapp_number = ?').get(number));
}

function saveGroupSetting({ groupId, groupName, groupType = 'customer', monitorRates = 0, broadcastEnabled = 0 }) {
  db.prepare(`
    INSERT INTO group_settings (group_id, group_name, group_type, monitor_rates, broadcast_enabled)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(group_id) DO UPDATE SET
      group_name = excluded.group_name,
      group_type = excluded.group_type,
      monitor_rates = excluded.monitor_rates,
      broadcast_enabled = excluded.broadcast_enabled,
      updated_at = CURRENT_TIMESTAMP
  `).run(groupId, groupName || groupId, groupType, monitorRates ? 1 : 0, broadcastEnabled ? 1 : 0);
}

function getGroupSetting(groupId) {
  return db.prepare('SELECT * FROM group_settings WHERE group_id = ?').get(groupId);
}

function getBroadcastGroups() {
  return db.prepare(`
    SELECT group_id, group_name
    FROM group_settings
    WHERE broadcast_enabled = 1 OR group_type = 'customer'
  `).all();
}

function getDailySalesSummary() {
  const row = db.prepare(`
    SELECT COUNT(*) AS orders, COALESCE(SUM(qty * sell_price), 0) AS revenue
    FROM orders
    WHERE date(created_at, 'localtime') = date('now', 'localtime')
  `).get();
  const byTool = db.prepare(`
    SELECT tool_name, SUM(qty) AS qty, COALESCE(SUM(qty * sell_price), 0) AS revenue
    FROM orders
    WHERE date(created_at, 'localtime') = date('now', 'localtime')
    GROUP BY tool_name
    ORDER BY qty DESC
    LIMIT 5
  `).all();
  return { ...row, byTool };
}

module.exports = {
  db,
  initDb,
  upsertDealer,
  saveRate,
  getTodayRates,
  getLast24hRates,
  getCheapestRates,
  upsertCustomer,
  createOrder,
  updateStock,
  adjustStockDelta,
  getStock,
  getLowStockRows,
  flagScammer,
  isScammer,
  saveGroupSetting,
  getGroupSetting,
  getBroadcastGroups,
  getDailySalesSummary
};
