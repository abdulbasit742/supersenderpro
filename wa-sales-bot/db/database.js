const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const {
  TOOL_CATALOG,
  ACCOUNT_TYPE_CATALOG,
  getDefaultPriceForAccountType
} = require('../config/tools');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'wa-sales-bot.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function hasColumn(tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some(row => row.name === columnName);
}

function ensureColumn(tableName, definition) {
  const columnName = definition.trim().split(/\s+/)[0];
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

function createBaseTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id INTEGER NOT NULL,
      plan_name TEXT NOT NULL,
      plan_slug TEXT NOT NULL,
      sell_price REAL NOT NULL DEFAULT 0,
      duration_days INTEGER NOT NULL DEFAULT 30,
      display_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(tool_id, plan_slug),
      FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      policy_text TEXT,
      policy_summary TEXT,
      max_issue_resolutions INTEGER NOT NULL DEFAULT 0,
      max_replacements INTEGER NOT NULL DEFAULT 0,
      shared_login INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      type_id INTEGER NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      is_limited_time INTEGER NOT NULL DEFAULT 0,
      limited_label TEXT,
      policy_summary TEXT,
      manual_slots INTEGER NOT NULL DEFAULT 0,
      UNIQUE(plan_id, type_id),
      FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (type_id) REFERENCES account_types(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dealer_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_number TEXT NOT NULL,
      dealer_name TEXT,
      dealer_code TEXT,
      tool_slug TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      plan_slug TEXT,
      buy_price REAL NOT NULL,
      date TEXT NOT NULL,
      group_id TEXT,
      group_name TEXT,
      message_text TEXT,
      raw_message TEXT,
      parsed_at TEXT,
      trust_status TEXT NOT NULL DEFAULT 'trusted',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trust_pending (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_number TEXT NOT NULL,
      dealer_name TEXT,
      tools_mentioned TEXT,
      first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      yes_votes INTEGER NOT NULL DEFAULT 0,
      no_votes INTEGER NOT NULL DEFAULT 0,
      voters_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      group_id TEXT,
      group_name TEXT,
      evidence_message TEXT
    );

    CREATE TABLE IF NOT EXISTS trusted_dealers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_number TEXT NOT NULL UNIQUE,
      dealer_name TEXT,
      dealer_code TEXT NOT NULL UNIQUE,
      tools_list TEXT,
      avg_price REAL NOT NULL DEFAULT 0,
      lowest_price REAL NOT NULL DEFAULT 0,
      trust_score REAL NOT NULL DEFAULT 50,
      yes_votes INTEGER NOT NULL DEFAULT 0,
      no_votes INTEGER NOT NULL DEFAULT 0,
      orders_completed INTEGER NOT NULL DEFAULT 0,
      accuracy_score REAL NOT NULL DEFAULT 80,
      added_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active TEXT,
      response_time_avg REAL NOT NULL DEFAULT 0,
      notes TEXT,
      tags TEXT
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      type_id INTEGER,
      key_value TEXT,
      account_email TEXT,
      account_pass TEXT,
      extra_info TEXT,
      credentials_json TEXT,
      is_used INTEGER NOT NULL DEFAULT 0,
      added_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      used_order_id TEXT,
      used_at TEXT,
      FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (type_id) REFERENCES account_types(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whatsapp_number TEXT NOT NULL UNIQUE,
      name TEXT,
      first_contact TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_contact TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_spent REAL NOT NULL DEFAULT 0,
      is_vip INTEGER NOT NULL DEFAULT 0,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      is_scammer INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      tool_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      type_id INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1,
      sell_price REAL NOT NULL DEFAULT 0,
      buy_price REAL NOT NULL DEFAULT 0,
      profit REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      payment_screenshot TEXT,
      payment_verified_at TEXT,
      order_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      delivery_date TEXT,
      renewal_date TEXT,
      review_requested_at TEXT,
      day1_followup_at TEXT,
      day25_reminder_at TEXT,
      day28_urgency_at TEXT,
      policy_snapshot TEXT,
      notes TEXT,
      warranty_replacements_used INTEGER NOT NULL DEFAULT 0,
      warranty_issues_resolved INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (type_id) REFERENCES account_types(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_row_id INTEGER NOT NULL,
      order_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT,
      ai_notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (order_row_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_number TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'IDLE',
      context_data TEXT,
      last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS broadcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      target_groups TEXT,
      scheduled_time TEXT,
      sent_at TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled'
    );

    CREATE TABLE IF NOT EXISTS scammers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      reason TEXT,
      evidence_message TEXT,
      flagged_date TEXT,
      added_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_slug TEXT NOT NULL,
      plan_slug TEXT NOT NULL,
      account_type TEXT NOT NULL,
      quantity_available INTEGER NOT NULL DEFAULT 0,
      quantity_total INTEGER NOT NULL DEFAULT 0,
      primary_dealer_code TEXT,
      backup_dealer_code TEXT,
      last_restocked_date TEXT,
      last_restocked_by TEXT,
      low_stock_threshold INTEGER NOT NULL DEFAULT 3,
      auto_reorder INTEGER NOT NULL DEFAULT 0,
      UNIQUE(tool_slug, plan_slug, account_type)
    );

    CREATE TABLE IF NOT EXISTS stock_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_slug TEXT NOT NULL,
      plan_slug TEXT NOT NULL,
      account_type TEXT NOT NULL,
      credentials_json TEXT NOT NULL,
      dealer_code TEXT,
      is_used INTEGER NOT NULL DEFAULT 0,
      used_by_order_id TEXT,
      added_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expiry_date TEXT
    );

    CREATE TABLE IF NOT EXISTS notify_me (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_number TEXT NOT NULL,
      customer_name TEXT,
      tool_slug TEXT NOT NULL,
      plan_slug TEXT NOT NULL,
      account_type TEXT NOT NULL,
      requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notified_at TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      UNIQUE(customer_number, tool_slug, plan_slug, account_type, status)
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_slug TEXT NOT NULL,
      plan_slug TEXT NOT NULL,
      summary_date TEXT NOT NULL,
      lowest_price REAL NOT NULL DEFAULT 0,
      highest_price REAL NOT NULL DEFAULT 0,
      average_price REAL NOT NULL DEFAULT 0,
      best_dealer_code TEXT,
      best_dealer_name TEXT,
      spread_pct REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tool_slug, plan_slug, summary_date)
    );
  `);
}

function runMigrations() {
  ensureColumn('stock', 'type_id INTEGER');
  ensureColumn('stock', 'credentials_json TEXT');
  ensureColumn('customers', 'is_scammer INTEGER NOT NULL DEFAULT 0');
  ensureColumn('orders', 'type_id INTEGER');
  ensureColumn('orders', 'policy_snapshot TEXT');
  ensureColumn('orders', 'warranty_replacements_used INTEGER NOT NULL DEFAULT 0');
  ensureColumn('orders', 'warranty_issues_resolved INTEGER NOT NULL DEFAULT 0');
  ensureColumn('dealer_rates', 'dealer_name TEXT');
  ensureColumn('dealer_rates', 'dealer_code TEXT');
  ensureColumn('dealer_rates', 'plan_slug TEXT');
  ensureColumn('dealer_rates', 'group_id TEXT');
  ensureColumn('dealer_rates', 'message_text TEXT');
  ensureColumn('dealer_rates', 'parsed_at TEXT');
  ensureColumn('dealer_rates', 'trust_status TEXT NOT NULL DEFAULT \'trusted\'');
  ensureColumn('scammers', 'evidence_message TEXT');
  ensureColumn('scammers', 'flagged_date TEXT');
}

function createIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rates_date_tool_plan ON dealer_rates(date, tool_slug, plan_name);
    CREATE INDEX IF NOT EXISTS idx_rates_created_at ON dealer_rates(created_at);
    CREATE INDEX IF NOT EXISTS idx_rates_status_tool_plan ON dealer_rates(trust_status, tool_slug, plan_slug, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_stock_tool_plan_type ON stock(tool_id, plan_id, type_id, is_used);
    CREATE INDEX IF NOT EXISTS idx_pricing_plan_type ON pricing(plan_id, type_id);
    CREATE INDEX IF NOT EXISTS idx_issues_order_id ON issues(order_id, status);
    CREATE INDEX IF NOT EXISTS idx_trust_pending_status_group ON trust_pending(status, group_id, first_seen);
    CREATE INDEX IF NOT EXISTS idx_trusted_dealers_code ON trusted_dealers(dealer_code, trust_score);
    CREATE INDEX IF NOT EXISTS idx_stock_inventory_lookup ON stock_inventory(tool_slug, plan_slug, account_type);
    CREATE INDEX IF NOT EXISTS idx_stock_keys_lookup ON stock_keys(tool_slug, plan_slug, account_type, is_used);
    CREATE INDEX IF NOT EXISTS idx_notify_me_lookup ON notify_me(status, tool_slug, plan_slug, account_type);
    CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON price_history(tool_slug, plan_slug, summary_date);
  `);
}

function seedCatalog() {
  const insertTool = db.prepare(`
    INSERT INTO tools (name, slug, description)
    VALUES (@name, @slug, @description)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description
  `);

  const getTool = db.prepare('SELECT id FROM tools WHERE slug = ?');
  const insertPlan = db.prepare(`
    INSERT INTO plans (tool_id, plan_name, plan_slug, sell_price, duration_days, display_order)
    VALUES (@tool_id, @plan_name, @plan_slug, @sell_price, @duration_days, @display_order)
    ON CONFLICT(tool_id, plan_slug) DO UPDATE SET
      plan_name = excluded.plan_name,
      sell_price = excluded.sell_price,
      duration_days = excluded.duration_days,
      display_order = excluded.display_order
  `);

  TOOL_CATALOG.forEach(tool => {
    insertTool.run({
      name: tool.name,
      slug: tool.slug,
      description: tool.description || ''
    });
    const toolRow = getTool.get(tool.slug);
    tool.plans.forEach((plan, index) => {
      insertPlan.run({
        tool_id: toolRow.id,
        plan_name: plan.planName,
        plan_slug: plan.planSlug,
        sell_price: plan.sellPrice,
        duration_days: plan.durationDays,
        display_order: index + 1
      });
    });
  });
}

function seedAccountTypesAndPricing() {
  const insertType = db.prepare(`
    INSERT INTO account_types (
      name, label, policy_text, policy_summary, max_issue_resolutions, max_replacements, shared_login, sort_order
    )
    VALUES (@name, @label, @policy_text, @policy_summary, @max_issue_resolutions, @max_replacements, @shared_login, @sort_order)
    ON CONFLICT(name) DO UPDATE SET
      label = excluded.label,
      policy_text = excluded.policy_text,
      policy_summary = excluded.policy_summary,
      max_issue_resolutions = excluded.max_issue_resolutions,
      max_replacements = excluded.max_replacements,
      shared_login = excluded.shared_login,
      sort_order = excluded.sort_order
  `);

  ACCOUNT_TYPE_CATALOG.forEach(type => {
    insertType.run({
      name: type.name,
      label: type.label,
      policy_text: type.policyText,
      policy_summary: type.policySummary,
      max_issue_resolutions: type.maxIssueResolutions || 0,
      max_replacements: type.maxReplacements || 0,
      shared_login: type.sharedLogin ? 1 : 0,
      sort_order: type.sortOrder || 0
    });
  });

  const accountTypes = db.prepare('SELECT * FROM account_types').all();
  const accountTypeMap = new Map(accountTypes.map(row => [row.name, row]));
  const planRows = db.prepare(`
    SELECT p.id AS plan_id, p.plan_name, p.plan_slug, p.sell_price, p.duration_days,
           t.id AS tool_id, t.slug AS tool_slug
    FROM plans p
    JOIN tools t ON t.id = p.tool_id
  `).all();

  const insertPricing = db.prepare(`
    INSERT INTO pricing (
      tool_id, plan_id, type_id, price, is_limited_time, limited_label, policy_summary, manual_slots
    )
    VALUES (@tool_id, @plan_id, @type_id, @price, @is_limited_time, @limited_label, @policy_summary, @manual_slots)
    ON CONFLICT(plan_id, type_id) DO UPDATE SET
      price = excluded.price,
      is_limited_time = excluded.is_limited_time,
      limited_label = excluded.limited_label,
      policy_summary = excluded.policy_summary
  `);

  planRows.forEach(plan => {
    ACCOUNT_TYPE_CATALOG.forEach(type => {
      const row = accountTypeMap.get(type.name);
      if (!row) return;
      insertPricing.run({
        tool_id: plan.tool_id,
        plan_id: plan.plan_id,
        type_id: row.id,
        price: getDefaultPriceForAccountType({ sellPrice: plan.sell_price }, type.name),
        is_limited_time: type.name === 'private' ? 1 : 0,
        limited_label: type.name === 'private' ? (type.limitedLabel || 'LIMITED TIME') : '',
        policy_summary: type.policySummary,
        manual_slots: 0
      });
    });
  });

  const warrantyType = accountTypeMap.get('warranty');
  if (warrantyType) {
    db.prepare('UPDATE stock SET type_id = ? WHERE type_id IS NULL').run(warrantyType.id);
    db.prepare('UPDATE orders SET type_id = ? WHERE type_id IS NULL').run(warrantyType.id);
  }
  db.prepare('UPDATE customers SET is_scammer = 1 WHERE whatsapp_number IN (SELECT number FROM scammers)').run();
}

function initDatabase() {
  createBaseTables();
  runMigrations();
  createIndexes();
  seedCatalog();
  seedAccountTypesAndPricing();
}

module.exports = {
  db,
  dbPath,
  initDatabase
};
