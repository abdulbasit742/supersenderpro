// API client for SuperSender Pro backend (Node.js at http://localhost:3001).
// All calls fall back to null (demo mode) when the backend is unreachable
// so the UI keeps working with mock data.

import { toast } from "sonner";
import type {
  HealthResponse, BusinessOverview, ProfitSeries, Order, Dealer,
  StockItem, Customer, Payment, Plan, Campaign, ChannelStatus,
  WhatsAppSession, FinancialsAnalytics, Alert,
} from "./types";

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://app.pakentrepreneur.me";

// ─── Demo-mode notification (shown at most once per session) ──────────────────

let _demoNotified = false;

export function notifyDemoModeOnce(endpoint: string) {
  if (_demoNotified) return;
  _demoNotified = true;
  toast.warning("Demo Mode", {
    description: `Backend offline (${endpoint}). Showing sample data.`,
    duration: 5000,
  });
}

export function resetDemoMode() {
  _demoNotified = false;
}

// ─── Auth header helper ───────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem("sb-" + new URL(API_BASE_URL).hostname + "-auth-token");
    if (raw) {
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (parsed.access_token) return { Authorization: `Bearer ${parsed.access_token}` };
    }
  } catch {
    // localStorage unavailable or token malformed — ignore
  }
  return {};
}

// ─── Core fetcher ─────────────────────────────────────────────────────────────

export async function apiRequest<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return (text ? (JSON.parse(text) as T) : null);
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    if (isAbort) {
      console.warn(`[API] Timeout: ${path}`);
    }
    notifyDemoModeOnce(path);
    return null;
  }
}

// ─── Method shorthands ────────────────────────────────────────────────────────

const get  = <T>(p: string)                    => apiRequest<T>(p);
const post = <T>(p: string, body?: unknown)    => apiRequest<T>(p, { method: "POST",   body: body ? JSON.stringify(body) : undefined });
const put  = <T>(p: string, body?: unknown)    => apiRequest<T>(p, { method: "PUT",    body: body ? JSON.stringify(body) : undefined });
const del  = <T>(p: string)                    => apiRequest<T>(p, { method: "DELETE" });

// ─── Typed API surface ────────────────────────────────────────────────────────

export const api = {
  // Health + dashboard
  getHealth:           () => get<HealthResponse>("/api/health"),
  getDashboardSummary: () => get<BusinessOverview>("/api/business/overview"),
  getProfitSeries:     (days = 7) => get<ProfitSeries>(`/api/analytics/profit?days=${days}`),
  getAlerts:           () => get<Alert[]>("/api/alerts"),
  markAlertRead:       (id: string) => put<Alert>(`/api/alerts/${id}/read`),

  // Plans / catalog / products
  getPlans:                  ()                               => get<Plan[]>("/api/plans"),
  createPlan:                (data: Partial<Plan>)            => post<Plan>("/api/plans", data),
  updatePlan:                (id: string, data: Partial<Plan>)=> put<Plan>(`/api/plans/${id}`, data),
  deletePlan:                (id: string)                     => del<void>(`/api/plans/${id}`),
  updatePlanAvailability:    (id: string, available: boolean) => post<Plan>(`/api/plans/${id}/availability`, { available }),
  forwardPlan:               (id: string, target: string)    => post<void>(`/api/plans/${id}/forward`, { target }),
  announcePlan:              (id: string)                    => post<void>(`/api/plans/${id}/announce`),
  getProducts:               ()                               => get<Plan[]>("/api/products"),
  createProduct:             (data: Partial<Plan>)            => post<Plan>("/api/products", data),
  updateProduct:             (id: string, data: Partial<Plan>)=> put<Plan>(`/api/products/${id}`, data),
  deleteProduct:             (id: string)                     => del<void>(`/api/products/${id}`),
  updateProductStock:        (id: string, stock: number)      => put<void>(`/api/products/${id}/stock`, { stock }),

  // Customers
  getCustomers:        ()          => get<Customer[]>("/api/customers"),
  getCustomer:         (id: string)=> get<Customer>(`/api/customers/${id}`),
  getCustomerTimeline: (id: string)=> get<unknown[]>(`/api/customers/${id}/timeline`),
  getCustomerSegments: ()          => get<unknown[]>("/api/customers/segments"),
  deleteCustomer:      (id: string)=> del<void>(`/api/customers/${id}`),

  // Orders
  getOrders:          ()                              => get<Order[]>("/api/orders"),
  getOrder:           (id: string)                    => get<Order>(`/api/orders/${id}`),
  createOrder:        (data: Partial<Order>)          => post<Order>("/api/orders", data),
  updateOrderStatus:  (id: string, status: string)    => put<Order>(`/api/orders/${id}/status`, { status }),
  deleteOrder:        (id: string)                    => del<void>(`/api/orders/${id}`),
  getOrderStats:      ()                              => get<unknown>("/api/orders/stats/summary"),

  // Payments
  getPayments:          ()                  => get<Payment[]>("/api/payments"),
  createPayment:        (data: unknown)     => post<Payment>("/api/payments", data),
  approvePayment:       (id: string)        => post<Payment>(`/api/payments/${id}/approve`),
  deletePayment:        (id: string)        => del<void>(`/api/payments/${id}`),
  manualVerifyPayment:  (data: unknown)     => post<Payment>("/api/payments/manual-verify", data),

  // Inbox / Live chats
  getInbox:         () => get<unknown[]>("/api/inbox"),
  inboxReply:       (data: unknown) => post<void>("/api/inbox/reply", data),
  getLiveChats:     () => get<unknown[]>("/api/live-chats"),
  getQuickReplies:  () => get<unknown[]>("/api/quick-replies"),

  // WhatsApp
  waConnect:     ()             => post<void>("/api/wa/connect"),
  waDisconnect:  ()             => post<void>("/api/wa/disconnect"),
  waReset:       ()             => post<void>("/api/wa/reset"),
  waSend:        (data: unknown)=> post<void>("/api/wa/send", data),
  waSendBulk:    (data: unknown)=> post<void>("/api/wa/send-bulk-parallel", data),
  waPairingCode: (data: unknown)=> post<WhatsAppSession>("/api/wa/pairing-code", data),

  // Groups
  getGroupsList:     () => get<unknown[]>("/api/groups/list"),
  getGroupsAnalytics:() => get<unknown>("/api/groups/analytics"),
  getGroupsTopActive:() => get<unknown[]>("/api/groups/top-active"),

  // Channels
  getChannelStatus:            () => get<ChannelStatus>("/api/channels/status"),
  startChannelAutomation:      () => post<void>("/api/channels/start"),
  pauseChannelAutomation:      () => post<void>("/api/channels/pause"),
  waChannelsDiscover:          () => post<void>("/api/wa/channels/discover"),
  waChannelsAutomationRunNow:  () => post<void>("/api/wa/channels/automation/run-now"),

  // Campaigns / Broadcast / Flows
  getCampaigns:        () => get<Campaign[]>("/api/campaigns"),
  getFlows:            () => get<unknown[]>("/api/flows"),
  toggleFlow:          (id: string) => put<void>(`/api/flows/${id}/toggle`),
  getScheduledMessages:() => get<unknown[]>("/api/scheduled-messages"),
  scheduleMessage:     (data: unknown) => post<void>("/api/scheduled-messages", data),

  // Social
  getSocialAccounts:  () => get<unknown[]>("/api/social/accounts"),
  publishSocialPost:  (data: unknown) => post<void>("/api/social/publish", data),
  socialTest:         (platform: string) => post<void>(`/api/social/test/${platform}`),

  // Analytics
  getAnalyticsFinancials: () => get<FinancialsAnalytics>("/api/analytics/financials"),
  getAnalyticsMessages:   () => get<unknown>("/api/analytics/messages"),
  getAnalyticsSentiment:  () => get<unknown>("/api/analytics/sentiment/overall"),

  // Stock
  getStockInventory: () => get<StockItem[]>("/api/business/stock-inventory"),

  // Dealers
  getTrustedDealers: () => get<Dealer[]>("/api/dealer-intelligence/trusted"),
  getPendingDealers: () => get<Dealer[]>("/api/dealer-intelligence/pending"),
  getScammerDealers: () => get<Dealer[]>("/api/dealer-intelligence/scammers"),

  // Wati Business Suite
  getWatiCosts:       () => get<unknown>("/api/wati/costs"),
  logWatiCost:        (data: unknown) => post<void>("/api/wati/costs/log", data),
  getWatiTemplates:   () => get<unknown[]>("/api/wati/templates"),
  createWatiTemplate: (data: unknown) => post<unknown>("/api/wati/templates", data),
  getWatiAdLeads:     () => get<unknown[]>("/api/wati/ad-leads"),
  trackWatiAdLead:    (data: unknown) => post<void>("/api/wati/ad-lead", data),
  getWatiFlows:       () => get<unknown[]>("/api/wati/flows"),
  saveWatiFlow:       (data: unknown) => post<unknown>("/api/wati/flows", data),
  deleteWatiFlow:     (id: string) => del<void>(`/api/wati/flows/${id}`),

  // Settings + audit
  saveSettings: (data: unknown) => post<void>("/api/settings", data),
  getLogs:      () => get<unknown[]>("/api/logs"),

  // Generic escape hatch for endpoints not yet typed
  raw: { get, post, put, del },
};
