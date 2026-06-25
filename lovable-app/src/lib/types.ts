// Domain types for SuperSender Pro — AI Tools Reseller CRM

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  title: string;
  message?: string;
  severity: "warning" | "info" | "error";
  read?: boolean;
  createdAt?: string;
}

export interface BusinessOverview {
  todayRevenue: number;
  todayProfit: number;
  todayOrders: number;
  activeDealers: number;
  trustedDealers: number;
  pendingOrders: number;
  pendingTrust: number;
  lowStockCount: number;
  avgMargin: number;
  alerts: Alert[];
}

export interface DailyProfit {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface ToolSales {
  tool: string;
  quantity: number;
  profit: number;
}

export interface ProfitSeries {
  daily: DailyProfit[];
  topTools: ToolSales[];
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Order {
  id: string;
  orderId: string;
  customerName?: string;
  customer?: { name: string; whatsapp: string };
  whatsapp?: string;
  tool: string;
  plan: string;
  qty?: number;
  quantity?: number;
  sellPrice: number;
  buyPrice?: number;
  profit: number;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Dealers ──────────────────────────────────────────────────────────────────

export type DealerStatus = "trusted" | "pending" | "scammer";

export interface Dealer {
  id: string;
  dealerCode: string;
  name: string;
  number: string;
  tools: string[];
  avgPrice: number;
  lowestPrice: number;
  trust: number;
  orders: number;
  lastActive: string;
  status: DealerStatus;
}

export interface DealerRate {
  id: string;
  tool: string;
  plan: string;
  buyPrice: number;
  sellPrice: number;
  dealerName: string;
  dealerCode: string;
  trust: DealerStatus;
  parsedAt: string;
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  tool: string;
  plan: string;
  accountType: string;
  available: number;
  total?: number;
  threshold?: number;
  dealerCode?: string;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  segment?: string;
  totalOrders?: number;
  totalSpend?: number;
  lastOrder?: string;
  createdAt?: string;
  tags?: string[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentMethod = "JazzCash" | "EasyPaisa" | "Bank" | "Cash";
export type PaymentStatus = "pending" | "approved" | "rejected";

export interface Payment {
  id: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  screenshotUrl?: string;
  orderId?: string;
  createdAt?: string;
  approvedAt?: string;
}

// ─── Plans / Catalog ─────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  tool: string;
  duration?: string;
  price: number;
  cost?: number;
  available?: boolean;
  description?: string;
  features?: string[];
}

// ─── WhatsApp / Channels ─────────────────────────────────────────────────────

export type WhatsAppStatus = "connected" | "disconnected" | "qr_pending" | "loading";

export interface WhatsAppSession {
  id: string;
  name: string;
  status: WhatsAppStatus;
  phone?: string;
  qrCode?: string;
  lastActivity?: string;
}

export interface ChannelStatus {
  running: boolean;
  lastRun?: string;
  processed?: number;
  errors?: number;
}

// ─── Campaigns / Broadcast ───────────────────────────────────────────────────

export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "failed";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  scheduledAt?: string;
  createdAt?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface FinancialsAnalytics {
  totalRevenue: number;
  totalProfit: number;
  avgOrderValue: number;
  refundRate: number;
  monthlyTrend: Array<{ month: string; revenue: number; profit: number }>;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "connected" | "degraded" | "error";
  engine?: string;
  proxy?: string;
  lastError?: string;
  uptime?: number;
}

// ─── Pagination helpers ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export interface Sale {
  id: string;
  date: string;
  customer: string;
  tool: string;
  plan?: string;
  qty: number;
  sellPrice: number;
  cost: number;
  profit: number;
  channel: string;
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export type PurchaseStatus = "pending" | "received" | "cancelled";

export interface Purchase {
  id: string;
  date: string;
  dealer: string;
  dealerCode: string;
  tool: string;
  qty: number;
  unitCost: number;
  total: number;
  status: PurchaseStatus;
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export type GroupParser = "ok" | "warn" | "off";

export interface Group {
  id: string;
  name: string;
  type: string;
  members: number;
  parser: GroupParser;
  health: number;
  dataCount: number;
  lastSeen: string;
}

// ─── Zero-Touch Jobs ──────────────────────────────────────────────────────────

export type JobStatus = "ok" | "warn" | "error" | "paused";

export interface ZeroTouchJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  nextRun: string;
  status: JobStatus;
}

// ─── Flows ────────────────────────────────────────────────────────────────────

export interface Flow {
  id: string;
  name: string;
  nodes: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Bots ─────────────────────────────────────────────────────────────────────

export interface Bot {
  id: string;
  name: string;
  replies: number;
  active: boolean;
  type?: string;
}

// ─── Dealer Rates ─────────────────────────────────────────────────────────────

export interface LiveRate {
  id: string;
  tool: string;
  plan: string;
  buyPrice: number;
  sellPrice: number;
  dealerName: string;
  dealerCode: string;
  trust: DealerStatus;
  parsedAt: string;
}

// ─── API wrapper ──────────────────────────────────────────────────────────────

export type ApiResult<T> = T | null;

// ─── Team ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name?: string;
  role: "admin" | "user";
  created_at: string;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  user_name?: string;
  action: string;
  target?: string;
  target_type?: string;
  severity: "info" | "success" | "warning" | "destructive";
  created_at: string;
}

export interface AuditStats {
  total: number;
  breakdown: Record<string, number>;
}

// ─── Giveaway ────────────────────────────────────────────────────────────────

export interface Giveaway {
  id: string;
  name: string;
  prize: string;
  entries: number;
  target: number;
  status: "active" | "ended" | "upcoming";
  endsIn: string;
}

// ─── Commerce / Marketplaces ─────────────────────────────────────────────────

export interface EcommerceAccount {
  id: string;
  platform: string;
  shop_name?: string;
  shop_id?: string;
  is_active: boolean;
  user_id?: string;
}

export interface MarketplaceListing {
  id: string;
  product_id?: string;
  platform: string;
  status: "draft" | "published" | "error";
  user_id?: string;
  created_at?: string;
}

// ─── Posts / Scheduler ───────────────────────────────────────────────────────

export interface PostTarget {
  id: string;
  platform: string;
  status: string;
  error_message?: string;
}

export interface ScheduledPost {
  id: string;
  content: string;
  status: "draft" | "scheduled" | "publishing" | "published" | "partial" | "failed";
  scheduled_at?: string;
  created_at?: string;
  post_targets?: PostTarget[];
}

// ─── Inbox ───────────────────────────────────────────────────────────────────

export interface ConversationThread {
  id: string;
  contact_name: string;
  contact_phone?: string;
  intent?: string;
  last_message?: string;
  unread_count: number;
  updated_at?: string;
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  content: string;
  sender: "me" | "contact";
  created_at: string;
}

// ─── Channel Source ──────────────────────────────────────────────────────────

export interface ChannelSource {
  id: string;
  name: string;
  identifier: string;
  bot_account_id?: string;
  auto_publish: boolean;
  ai_rewrite: boolean;
}

export interface ChannelItem {
  id: string;
  source_id: string;
  text?: string;
  status: "pending" | "published" | "failed";
  published_at?: string;
}
