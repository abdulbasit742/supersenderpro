import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export interface DealerPriceAlert {
  id: string;
  product: string;
  dealerName?: string;
  groupName?: string;
  newPrice: number;
  previousPrice?: number;
  change: number;
  changePercent: number;
  direction: "cheaper" | "expensive" | "same";
  rawMessage?: string;
  detectedAt: string;
  isRead: boolean;
}

export interface MonitoredGroup {
  id: string;
  name: string;
  groupId?: string;
  platform: "whatsapp" | "telegram";
  isActive: boolean;
  lastCheckedAt?: string;
  alertsCount: number;
}

export interface PriceSnapshot {
  product: string;
  dealerName?: string;
  price: number;
  date: string;
}

export interface MarginAnalysis {
  product: string;
  bestDealerPrice: number;
  yourSellPrice: number;
  margin: number;
  marginPercent: number;
  recommendation: string;
}

const MOCK_ALERTS: DealerPriceAlert[] = [
  { id: "a1", product: "ChatGPT Plus", dealerName: "Ali Raza", groupName: "AI Tools Dealers", newPrice: 900, previousPrice: 1000, change: -100, changePercent: -10, direction: "cheaper", rawMessage: "ChatGPT Plus stock 900 each limited", detectedAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
  { id: "a2", product: "Claude Pro", dealerName: "Ahmed Deals", groupName: "Premium Resellers", newPrice: 1400, previousPrice: 1300, change: 100, changePercent: 7.7, direction: "expensive", rawMessage: "Claude Pro now 1400 per month", detectedAt: new Date(Date.now() - 7200000).toISOString(), isRead: false },
  { id: "a3", product: "LinkedIn Premium", dealerName: "Digital Store", groupName: "Software Hub", newPrice: 2200, previousPrice: 2500, change: -300, changePercent: -12, direction: "cheaper", rawMessage: "LinkedIn premium 2200 bulk available", detectedAt: new Date(Date.now() - 86400000).toISOString(), isRead: true },
];

export const getMonitoredGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("monitored_groups").select("*").eq("user_id", userId);
    if (!data?.length) return [] as MonitoredGroup[];
    return (data ?? []) as MonitoredGroup[];
  });

export const saveMonitoredGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    groupId: z.string().optional(),
    platform: z.enum(["whatsapp", "telegram"]),
    isActive: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const payload: Record<string, unknown> = { user_id: userId, name: data.name, group_id: data.groupId, platform: data.platform, is_active: data.isActive ?? true, alerts_count: 0 };
    if (data.id) {
      const { data: r } = await db.from("monitored_groups").update(payload).eq("id", data.id).eq("user_id", userId).select().single();
      return r;
    }
    const { data: r } = await db.from("monitored_groups").insert(payload).select().single();
    return r;
  });

export const getPriceAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unreadOnly: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    let q = db.from("dealer_price_alerts").select("*").eq("user_id", userId).order("detected_at", { ascending: false }).limit(100);
    if (data.unreadOnly) q = q.eq("is_read", false);
    const { data: alerts } = await q;
    if (!alerts?.length) return MOCK_ALERTS;
    return (alerts ?? []) as DealerPriceAlert[];
  });

export const markAlertRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("dealer_price_alerts").update({ is_read: true }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const extractPricesFromMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message: z.string().min(1).max(2000), groupName: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY ?? "";
    if (!key) {
      return [{ product: "Unknown Product", price: 0, confidence: 0 }];
    }
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a price extraction AI for a Pakistani reseller business. Extract product prices from dealer messages. Return JSON array: [{product: string, price: number (PKR), confidence: number (0-100), dealerNote: string|null}]. If no prices found, return []." },
          { role: "user", content: data.message },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return [];
    const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
    try {
      const content = j.choices?.[0]?.message?.content ?? "[]";
      const parsed = JSON.parse(content) as unknown;
      return Array.isArray(parsed) ? parsed as Array<{ product: string; price: number; confidence: number }> : [];
    } catch { return []; }
  });

export const getMarginAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: catalog } = await supabase.from("catalog").select("name, sell_price").eq("user_id", userId);
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: rates } = await supabase.from("rates").select("tool, dealer_price").eq("user_id", userId);

    return (catalog ?? []).map((p) => {
      const rate = (rates ?? []).find((r) => r.tool === p.name);
      const dealerPrice = Number(rate?.dealer_price ?? 0);
      const sellPrice = Number(p.sell_price ?? 0);
      const margin = sellPrice - dealerPrice;
      const marginPercent = dealerPrice > 0 ? Math.round((margin / dealerPrice) * 100) : 0;
      const recommendation = marginPercent < 10 ? "⚠️ Low margin — increase sell price" : marginPercent > 50 ? "✅ Good margin — competitive" : "💡 OK — monitor competitor prices";
      return { product: p.name, bestDealerPrice: dealerPrice, yourSellPrice: sellPrice, margin, marginPercent, recommendation } as MarginAnalysis;
    });
  });
