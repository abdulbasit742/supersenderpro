import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RFMScore {
  customerId: string;
  customerName?: string;
  whatsapp?: string;
  recency: number;     // days since last order
  frequency: number;  // total orders
  monetary: number;   // total spend PKR
  rfmScore: number;   // 1-15 composite
  segment: "champion" | "loyal" | "potential" | "at_risk" | "lost" | "new";
  churnRisk: "high" | "medium" | "low";
  predictedNextOrder?: string; // ISO date
  tags: string[];
}

export interface ChurnAlert {
  customerId: string;
  customerName?: string;
  whatsapp?: string;
  lastOrderDays: number;
  avgOrderInterval: number;
  riskScore: number; // 0-100
  suggestedAction: string;
}

export interface HotLead {
  customerId: string;
  customerName?: string;
  whatsapp?: string;
  signal: string;
  confidence: number;
  suggestedProduct?: string;
  suggestedPrice?: number;
}

export interface IntelligenceStats {
  totalCustomers: number;
  champions: number;
  atRisk: number;
  hotLeads: number;
  churnRiskRevenue: number;
}

export const getCustomerRFM = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: customers } = await supabase
      .from("customers").select("id, name, whatsapp, created_at").eq("user_id", userId);
    const { data: orders } = await supabase
      .from("orders").select("customer_id, sell_price, created_at, status")
      .eq("user_id", userId).neq("status", "cancelled");

    const now = Date.now();
    const results: RFMScore[] = (customers ?? []).map((c) => {
      const cOrders = (orders ?? []).filter((o) => o.customer_id === c.id);
      const sorted = cOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const recency = sorted.length ? Math.floor((now - new Date(sorted[0].created_at).getTime()) / 86400000) : 999;
      const frequency = cOrders.length;
      const monetary = cOrders.reduce((s, o) => s + (Number(o.sell_price) || 0), 0);

      const rScore = recency < 7 ? 5 : recency < 14 ? 4 : recency < 30 ? 3 : recency < 60 ? 2 : 1;
      const fScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
      const mScore = monetary >= 50000 ? 5 : monetary >= 20000 ? 4 : monetary >= 10000 ? 3 : monetary >= 5000 ? 2 : 1;
      const rfmScore = rScore + fScore + mScore;

      const segment: RFMScore["segment"] =
        rfmScore >= 13 ? "champion" :
        rfmScore >= 10 ? "loyal" :
        rfmScore >= 7  ? "potential" :
        rfmScore >= 5  ? "at_risk" :
        frequency === 0 ? "new" : "lost";

      const churnRisk: RFMScore["churnRisk"] = recency > 45 ? "high" : recency > 25 ? "medium" : "low";

      let avgInterval = 30;
      if (sorted.length >= 2) {
        const intervals = sorted.slice(0, -1).map((o, i) =>
          (new Date(o.created_at).getTime() - new Date(sorted[i + 1].created_at).getTime()) / 86400000
        );
        avgInterval = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
      }
      const predictedNextOrder = sorted.length
        ? new Date(new Date(sorted[0].created_at).getTime() + avgInterval * 86400000).toISOString()
        : undefined;

      const tags: string[] = [];
      if (rfmScore >= 13) tags.push("VIP");
      if (churnRisk === "high") tags.push("Churn Risk");
      if (frequency === 1) tags.push("First Time");
      if (monetary > 20000) tags.push("Big Spender");

      return { customerId: c.id, customerName: c.name, whatsapp: c.whatsapp, recency, frequency, monetary, rfmScore, segment, churnRisk, predictedNextOrder, tags };
    });

    return results.sort((a, b) => b.rfmScore - a.rfmScore);
  });

export const getChurnAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: customers } = await supabase.from("customers").select("id, name, whatsapp").eq("user_id", userId);
    const { data: orders } = await supabase.from("orders")
      .select("customer_id, created_at").eq("user_id", userId).neq("status", "cancelled")
      .order("created_at", { ascending: false });

    const now = Date.now();
    const alerts: ChurnAlert[] = [];
    for (const c of (customers ?? [])) {
      const cOrders = (orders ?? []).filter((o) => o.customer_id === c.id);
      if (cOrders.length === 0) continue;
      const sorted = cOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastOrderDays = Math.floor((now - new Date(sorted[0].created_at).getTime()) / 86400000);
      if (lastOrderDays < 20) continue;

      let avgInterval = 30;
      if (sorted.length >= 2) {
        const gaps = sorted.slice(0, -1).map((o, i) =>
          (new Date(o.created_at).getTime() - new Date(sorted[i + 1].created_at).getTime()) / 86400000
        );
        avgInterval = Math.round(gaps.reduce((s, v) => s + v, 0) / gaps.length);
      }
      const riskScore = Math.min(100, Math.round((lastOrderDays / avgInterval) * 50));
      if (riskScore < 40) continue;

      const suggestedAction = riskScore > 80
        ? "Send win-back offer with 10% discount"
        : riskScore > 60
          ? "Send renewal reminder or product update"
          : "Check in message — ke haal hai?";

      alerts.push({ customerId: c.id, customerName: c.name, whatsapp: c.whatsapp, lastOrderDays, avgOrderInterval: avgInterval, riskScore, suggestedAction });
    }
    return alerts.sort((a, b) => b.riskScore - a.riskScore);
  });

export const getHotLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: conversations } = await supabase
      .from("conversations").select("customer_id, intent, last_message, created_at")
      .eq("user_id", userId).gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString());
    const { data: customers } = await supabase.from("customers").select("id, name, whatsapp").eq("user_id", userId);

    const leads: HotLead[] = (conversations ?? [])
      .filter((cv) => ["price_inquiry", "availability", "order"].includes(cv.intent ?? ""))
      .map((cv) => {
        const cust = (customers ?? []).find((c) => c.id === cv.customer_id);
        const confidence = cv.intent === "order" ? 90 : cv.intent === "price_inquiry" ? 70 : 55;
        return { customerId: cv.customer_id ?? "", customerName: cust?.name, whatsapp: cust?.whatsapp, signal: cv.intent ?? "inquiry", confidence, suggestedProduct: "ChatGPT Plus", suggestedPrice: 1500 };
      });
    return leads;
  });

export const getIntelligenceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count: total } = await supabase.from("customers").select("id", { count: "exact", head: true }).eq("user_id", userId);
    const { data: recentOrders } = await supabase.from("orders").select("customer_id, sell_price, created_at").eq("user_id", userId).neq("status", "cancelled");

    const now = Date.now();
    const customerMap = new Map<string, { lastOrder: number; total: number }>();
    for (const o of (recentOrders ?? [])) {
      const d = new Date(o.created_at).getTime();
      const prev = customerMap.get(o.customer_id) ?? { lastOrder: 0, total: 0 };
      customerMap.set(o.customer_id, { lastOrder: Math.max(prev.lastOrder, d), total: prev.total + (Number(o.sell_price) || 0) });
    }
    let atRisk = 0; let churnRiskRevenue = 0; let champions = 0;
    for (const [, v] of customerMap) {
      const days = Math.floor((now - v.lastOrder) / 86400000);
      if (days > 30) { atRisk++; churnRiskRevenue += v.total * 0.3; }
      if (v.total > 20000 && days < 14) champions++;
    }
    return { totalCustomers: total ?? 0, champions, atRisk, hotLeads: 5, churnRiskRevenue: Math.round(churnRiskRevenue) } as IntelligenceStats;
  });
