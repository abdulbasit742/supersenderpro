// API client for SuperSender Pro backend (Node.js at http://localhost:3001).
// Endpoints mirror the server.js routes in
// https://github.com/abdulbasit742/supersenderpro
// All calls fall back to `null` (demo mode) when the backend is unreachable
// so the UI keeps working with mock data.

import { toast } from "sonner";

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) ||
  "https://app.pakentrepreneur.me";

let demoModeNotified = false;
export function notifyDemoModeOnce(endpoint: string) {
  if (demoModeNotified) return;
  demoModeNotified = true;
  toast.warning("Demo Mode", {
    description: `Backend endpoint not available: ${endpoint}. Showing demo data.`,
  });
}

export async function apiRequest<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    notifyDemoModeOnce(path);
    return null;
  }
}

const get = <T>(p: string) => apiRequest<T>(p);
const post = <T>(p: string, body?: unknown) =>
  apiRequest<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const put = <T>(p: string, body?: unknown) =>
  apiRequest<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
const del = <T>(p: string) => apiRequest<T>(p, { method: "DELETE" });

// ---------- Endpoints (subset of the 690 backend routes) ----------
export const api = {
  // Health + dashboard
  getHealth: () =>
    get<{ status: string; engine?: string; proxy?: string; lastError?: string }>(
      "/api/health"
    ),
  getDashboardSummary: () => get<any>("/api/dashboard/summary"),
  getAlerts: () => get<any[]>("/api/alerts"),
  markAlertRead: (id: string) => put<any>(`/api/alerts/${id}/read`),

  // Plans / catalog / products
  getPlans: () => get<any[]>("/api/plans"),
  createPlan: (data: unknown) => post<any>("/api/plans", data),
  updatePlan: (id: string, data: unknown) => put<any>(`/api/plans/${id}`, data),
  deletePlan: (id: string) => del<any>(`/api/plans/${id}`),
  updatePlanAvailability: (id: string, available: boolean) =>
    post<any>(`/api/plans/${id}/availability`, { available }),
  forwardPlan: (id: string, target: string) =>
    post<any>(`/api/plans/${id}/forward`, { target }),
  announcePlan: (id: string) => post<any>(`/api/plans/${id}/announce`),
  getProducts: () => get<any[]>("/api/products"),
  createProduct: (data: unknown) => post<any>("/api/products", data),
  updateProduct: (id: string, data: unknown) => put<any>(`/api/products/${id}`, data),
  deleteProduct: (id: string) => del<any>(`/api/products/${id}`),
  updateProductStock: (id: string, stock: number) =>
    put<any>(`/api/products/${id}/stock`, { stock }),

  // Customers
  getCustomers: () => get<any[]>("/api/customers"),
  getCustomer: (id: string) => get<any>(`/api/customers/${id}`),
  getCustomerTimeline: (id: string) => get<any[]>(`/api/customers/${id}/timeline`),
  getCustomerSegments: () => get<any[]>("/api/customers/segments"),
  deleteCustomer: (id: string) => del<any>(`/api/customers/${id}`),

  // Orders
  getOrders: () => get<any[]>("/api/orders"),
  getOrder: (id: string) => get<any>(`/api/orders/${id}`),
  createOrder: (data: unknown) => post<any>("/api/orders", data),
  updateOrderStatus: (id: string, status: string) =>
    put<any>(`/api/orders/${id}/status`, { status }),
  deleteOrder: (id: string) => del<any>(`/api/orders/${id}`),
  getOrderStats: () => get<any>("/api/orders/stats/summary"),

  // Payments
  getPayments: () => get<any[]>("/api/payments"),
  createPayment: (data: unknown) => post<any>("/api/payments", data),
  approvePayment: (id: string) => post<any>(`/api/payments/${id}/approve`),
  deletePayment: (id: string) => del<any>(`/api/payments/${id}`),
  manualVerifyPayment: (data: unknown) => post<any>("/api/payments/manual-verify", data),

  // Inbox / Live chats / Bots
  getInbox: () => get<any[]>("/api/inbox"),
  inboxReply: (data: unknown) => post<any>("/api/inbox/reply", data),
  getLiveChats: () => get<any[]>("/api/live-chats"),
  getQuickReplies: () => get<any[]>("/api/quick-replies"),

  // WhatsApp
  waConnect: () => post<any>("/api/wa/connect"),
  waDisconnect: () => post<any>("/api/wa/disconnect"),
  waReset: () => post<any>("/api/wa/reset"),
  waSend: (data: unknown) => post<any>("/api/wa/send", data),
  waSendBulk: (data: unknown) => post<any>("/api/wa/send-bulk-parallel", data),
  waPairingCode: (data: unknown) => post<any>("/api/wa/pairing-code", data),

  // Groups
  getGroupsList: () => get<any[]>("/api/groups/list"),
  getGroupsAnalytics: () => get<any>("/api/groups/analytics"),
  getGroupsTopActive: () => get<any[]>("/api/groups/top-active"),

  // Channels
  getChannelStatus: () => get<any>("/api/channels/status"),
  startChannelAutomation: () => post<any>("/api/channels/start"),
  pauseChannelAutomation: () => post<any>("/api/channels/pause"),
  waChannelsDiscover: () => post<any>("/api/wa/channels/discover"),
  waChannelsAutomationRunNow: () => post<any>("/api/wa/channels/automation/run-now"),

  // Campaigns / Broadcast / Flows
  getCampaigns: () => get<any[]>("/api/campaigns"),
  getFlows: () => get<any[]>("/api/flows"),
  toggleFlow: (id: string) => put<any>(`/api/flows/${id}/toggle`),
  getScheduledMessages: () => get<any[]>("/api/scheduled-messages"),
  scheduleMessage: (data: unknown) => post<any>("/api/scheduled-messages", data),

  // Social
  getSocialAccounts: () => get<any[]>("/api/social/accounts"),
  publishSocialPost: (data: unknown) => post<any>("/api/social/publish", data),
  socialTest: (platform: string) => post<any>(`/api/social/test/${platform}`),

  // Analytics
  getAnalyticsFinancials: () => get<any>("/api/analytics/financials"),
  getAnalyticsMessages: () => get<any>("/api/analytics/messages"),
  getAnalyticsSentiment: () => get<any>("/api/analytics/sentiment/overall"),

  // Code Intelligence
  getCodeIntelligenceStatus: () => get<any>("/api/code-intelligence/status"),
  runCodeScan: () => post<any>("/api/code-intelligence/scan"),

  // Settings + audit
  saveSettings: (data: unknown) => post<any>("/api/settings", data),
  getLogs: () => get<any[]>("/api/logs"),

  // Generic escape hatch for any of the other ~600 endpoints
  raw: { get, post, put, del },
};

export type HealthResponse = Awaited<ReturnType<typeof api.getHealth>>;
