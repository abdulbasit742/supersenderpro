-- PostgreSQL reference schema for the Pakistan AI Tools payment automation layer.
-- Prisma remains the application source of truth; this file is useful for audits,
-- manual reporting databases, or importing the payment module into another stack.

CREATE TABLE IF NOT EXISTS ai_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  plans JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  wa_number TEXT UNIQUE NOT NULL,
  name TEXT,
  purchases INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  scammer_flag BOOLEAN DEFAULT FALSE,
  priority_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dealers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  wa_number TEXT UNIQUE NOT NULL,
  dealer_code TEXT UNIQUE,
  trust_score NUMERIC(5,2) DEFAULT 0,
  rates JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts_stock (
  id TEXT PRIMARY KEY,
  tool_id TEXT REFERENCES ai_tools(id),
  plan_type TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('private','warranty','non_warranty')),
  credentials_encrypted TEXT NOT NULL,
  dealer_code TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','sold','warranty','blocked')),
  sold_order_id TEXT,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  customer_wa TEXT NOT NULL,
  tool_id TEXT REFERENCES ai_tools(id),
  plan TEXT NOT NULL,
  account_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_status TEXT DEFAULT 'awaiting_payment',
  txn_hash TEXT UNIQUE,
  txn_last4 TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS warranties (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  replacement_count INTEGER DEFAULT 0,
  issue_count INTEGER DEFAULT 0,
  expiry_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS dealer_rates (
  id TEXT PRIMARY KEY,
  dealer_number TEXT NOT NULL,
  dealer_code TEXT,
  tool_slug TEXT NOT NULL,
  plan_slug TEXT,
  price NUMERIC(12,2) NOT NULL,
  group_id TEXT,
  message_text TEXT,
  parsed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_notifications (
  id TEXT PRIMARY KEY,
  txn_hash TEXT UNIQUE NOT NULL,
  txn_reference_masked TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  sender_mobile TEXT,
  payment_method TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  matched_order_id TEXT,
  fraud_score INTEGER DEFAULT 0,
  review_reason TEXT,
  raw_snippet TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scammers (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  reason TEXT,
  evidence_message TEXT,
  flagged_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  ip TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(payment_status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_status_created ON payment_notifications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_dealer_rates_tool_time ON dealer_rates(tool_slug, plan_slug, parsed_at);
CREATE INDEX IF NOT EXISTS idx_stock_available ON accounts_stock(tool_id, plan_type, account_type, status);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_logs(action, created_at);

CREATE TABLE IF NOT EXISTS customer_memory (
  id TEXT PRIMARY KEY,
  customer_id TEXT UNIQUE NOT NULL,
  communication_style TEXT DEFAULT 'mixed',
  preferred_payment_method TEXT,
  preferred_tools JSONB DEFAULT '[]'::jsonb,
  score_tier TEXT DEFAULT 'Bronze',
  last_intent TEXT,
  last_positive_at TIMESTAMPTZ,
  last_negative_at TIMESTAMPTZ,
  promotion_sent_this_week INTEGER DEFAULT 0,
  last_promotional_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_timeline_events (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  order_id TEXT,
  event_type TEXT NOT NULL,
  channel TEXT DEFAULT 'whatsapp',
  summary TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  response TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_tasks (
  id TEXT PRIMARY KEY,
  task_key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  customer_id TEXT,
  order_id TEXT,
  status TEXT DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_memory_tier ON customer_memory(score_tier);
CREATE INDEX IF NOT EXISTS idx_timeline_customer_type ON customer_timeline_events(customer_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_automation_due ON automation_tasks(type, status, scheduled_at);
