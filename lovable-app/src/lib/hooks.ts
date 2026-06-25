// Centralised React Query hooks for SuperSender Pro.
// Each hook owns its cache key, stale time, and fallback to mock data.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import {
  businessOverview, profitSeries, trustedDealersData,
  recentOrders, stockInventoryData, salesData, purchasesData,
  zeroTouchJobs, dealerRates,
} from "./mock-reseller";
import type {
  Dealer, Order, StockItem, Sale, Purchase, Group,
  ZeroTouchJob, Flow, Bot, LiveRate, Campaign, Customer, Payment,
} from "./types";

// ─── Stale-time constants ─────────────────────────────────────────────────────

const STALE = {
  health:    15_000,   // 15 s
  realtime:  30_000,   // 30 s
  standard:  60_000,   // 1 min
  slow:     300_000,   // 5 min
} as const;

// ─── Health ───────────────────────────────────────────────────────────────────

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn:  () => api.getHealth(),
    staleTime: STALE.health,
    refetchInterval: STALE.health,
    retry: 1,
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useBusinessOverview() {
  return useQuery({
    queryKey: ["business", "overview"],
    queryFn:  async () => {
      const data = await api.getDashboardSummary();
      return data ?? businessOverview;
    },
    staleTime: STALE.realtime,
    placeholderData: businessOverview,
  });
}

export function useProfitSeries(days = 7) {
  return useQuery({
    queryKey: ["analytics", "profit", days],
    queryFn:  async () => {
      const data = await api.getProfitSeries(days);
      return data ?? profitSeries;
    },
    staleTime: STALE.standard,
    placeholderData: profitSeries,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn:  () => api.getAlerts(),
    staleTime: STALE.realtime,
  });
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export function useStockInventory() {
  return useQuery({
    queryKey: ["stock", "inventory"],
    queryFn:  async () => {
      const data = await api.getStockInventory();
      return (data ?? stockInventoryData) as StockItem[];
    },
    staleTime: STALE.standard,
    placeholderData: stockInventoryData as StockItem[],
  });
}

// ─── Dealers ──────────────────────────────────────────────────────────────────

export function useDealers() {
  return useQuery({
    queryKey: ["dealers"],
    queryFn: async () => {
      const [trusted, pending, scammers] = await Promise.all([
        api.getTrustedDealers(),
        api.getPendingDealers(),
        api.getScammerDealers(),
      ]);
      const merged: Dealer[] = [
        ...(trusted  ?? []).map((d) => ({ ...d, status: "trusted"  as const })),
        ...(pending  ?? []).map((d) => ({ ...d, status: "pending"  as const })),
        ...(scammers ?? []).map((d) => ({ ...d, status: "scammer"  as const })),
      ];
      return merged.length ? merged : (trustedDealersData as Dealer[]);
    },
    staleTime: STALE.standard,
    placeholderData: trustedDealersData as Dealer[],
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const data = await api.getOrders();
      return (data ?? recentOrders) as Order[];
    },
    staleTime: STALE.standard,
    placeholderData: recentOrders as Order[],
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateOrderStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); },
  });
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn:  () => api.getPlans(),
    staleTime: STALE.slow,
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn:  () => api.getCustomers(),
    staleTime: STALE.standard,
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn:  () => api.getPayments(),
    staleTime: STALE.realtime,
  });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.approvePayment(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["payments"] }); },
  });
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn:  () => api.getCampaigns(),
    staleTime: STALE.standard,
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useFinancialsAnalytics() {
  return useQuery({
    queryKey: ["analytics", "financials"],
    queryFn:  () => api.getAnalyticsFinancials(),
    staleTime: STALE.slow,
  });
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const data = await api.raw.get<Sale[]>("/api/business/sales?limit=100");
      return (data ?? salesData) as Sale[];
    },
    staleTime: STALE.standard,
    placeholderData: salesData as Sale[],
  });
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export function usePurchases() {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const data = await api.raw.get<Purchase[]>("/api/business/purchases?limit=100");
      return (data ?? purchasesData) as Purchase[];
    },
    staleTime: STALE.standard,
    placeholderData: purchasesData as Purchase[],
  });
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const data = await api.getGroupsList();
      return (data ?? []) as Group[];
    },
    staleTime: STALE.standard,
  });
}

// ─── Zero-Touch Jobs ──────────────────────────────────────────────────────────

export function useZeroTouchJobs() {
  return useQuery({
    queryKey: ["zero-touch", "jobs"],
    queryFn: async () => {
      const data = await api.raw.get<ZeroTouchJob[]>("/api/zero-touch/jobs");
      return (data ?? zeroTouchJobs) as ZeroTouchJob[];
    },
    staleTime: STALE.realtime,
    refetchInterval: STALE.realtime,
    placeholderData: zeroTouchJobs as ZeroTouchJob[],
  });
}

// ─── Dealer Live Rates ────────────────────────────────────────────────────────

export function useLiveRates() {
  return useQuery({
    queryKey: ["rates", "live"],
    queryFn: async () => {
      const data = await api.raw.get<LiveRate[]>("/api/dealer-intelligence/rates?limit=300");
      return (data ?? dealerRates) as LiveRate[];
    },
    staleTime: STALE.standard,
    placeholderData: dealerRates as LiveRate[],
  });
}

// ─── Flows ────────────────────────────────────────────────────────────────────

export function useFlows() {
  return useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const data = await api.getFlows();
      return (data ?? []) as Flow[];
    },
    staleTime: STALE.slow,
  });
}

export function useToggleFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleFlow(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["flows"] }); },
  });
}

// ─── Bots ─────────────────────────────────────────────────────────────────────

export function useBots() {
  return useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const data = await api.raw.get<Bot[]>("/api/bots");
      return (data ?? []) as Bot[];
    },
    staleTime: STALE.slow,
  });
}

// ─── WhatsApp Health ──────────────────────────────────────────────────────────

export function useWhatsAppSessions() {
  return useQuery({
    queryKey: ["whatsapp", "sessions"],
    queryFn:  () => api.raw.get<unknown[]>("/api/whatsapp/sessions"),
    staleTime: STALE.realtime,
    refetchInterval: STALE.realtime,
  });
}

// ─── Customers (extended) ─────────────────────────────────────────────────────

export function useCustomerList() {
  return useQuery({
    queryKey: ["customers", "list"],
    queryFn: async () => {
      const data = await api.getCustomers();
      return (data ?? []) as Customer[];
    },
    staleTime: STALE.standard,
  });
}

// ─── Payments (extended) ──────────────────────────────────────────────────────

export function usePaymentList() {
  return useQuery({
    queryKey: ["payments", "list"],
    queryFn: async () => {
      const data = await api.getPayments();
      return (data ?? []) as Payment[];
    },
    staleTime: STALE.realtime,
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePayment(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["payments"] }); },
  });
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function useCampaignList() {
  return useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: async () => {
      const data = await api.getCampaigns();
      return (data ?? []) as Campaign[];
    },
    staleTime: STALE.standard,
  });
}
