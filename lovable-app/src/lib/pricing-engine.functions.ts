import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export interface PricingRule {
  id: string;
  productId: string;
  productName: string;
  basePrice: number;
  currentPrice: number;
  rules: PriceCondition[];
  isActive: boolean;
  lastUpdated?: string;
}

export interface PriceCondition {
  type: "low_stock" | "high_demand" | "vip_customer" | "time_of_day" | "flash_sale" | "competitor_match";
  condition: string;
  adjustment: number;    // PKR or percentage
  adjustmentType: "flat" | "percent";
  description: string;
}

export interface PriceHistory {
  productId: string;
  productName: string;
  price: number;
  reason: string;
  changedAt: string;
}

export const getPricingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("pricing_rules")
      .select("*").eq("user_id", userId).order("product_name");
    return (data ?? []) as PricingRule[];
  });

export const savePricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    productId: z.string(),
    productName: z.string().min(1).max(200),
    basePrice: z.number().positive(),
    rules: z.array(z.object({
      type: z.enum(["low_stock","high_demand","vip_customer","time_of_day","flash_sale","competitor_match"]),
      condition: z.string(),
      adjustment: z.number(),
      adjustmentType: z.enum(["flat","percent"]),
      description: z.string(),
    })),
    isActive: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const payload: Record<string, unknown> = {
      user_id: userId,
      product_id: data.productId,
      product_name: data.productName,
      base_price: data.basePrice,
      current_price: data.basePrice,
      rules: data.rules,
      is_active: data.isActive ?? true,
      last_updated: new Date().toISOString(),
    };
    let result: Record<string, unknown> | null = null;
    if (data.id) {
      const { data: r } = await db.from("pricing_rules").update(payload).eq("id", data.id).eq("user_id", userId).select().single();
      result = r as Record<string, unknown> | null;
    } else {
      const { data: r } = await db.from("pricing_rules").insert(payload).select().single();
      result = r as Record<string, unknown> | null;
    }
    await logAuditEvent({ data: { action: "Pricing rule saved", target: data.productName, targetType: "pricing_rule", severity: "info" } });
    return result;
  });

export const deletePricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("pricing_rules").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const computeEffectivePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    productId: z.string(),
    stockLevel: z.number().int().nonnegative().optional(),
    isVip: z.boolean().optional(),
    hour: z.number().int().min(0).max(23).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: rule } = await db.from("pricing_rules")
      .select("*").eq("product_id", data.productId).eq("user_id", userId).eq("is_active", true).single();
    if (!rule) return { price: null, adjustments: [] };

    const r = rule as Record<string, unknown>;
    let price = Number(r.base_price);
    const adjustments: string[] = [];

    for (const cond of ((r.rules as PriceCondition[]) ?? [])) {
      let triggered = false;
      if (cond.type === "low_stock" && (data.stockLevel ?? 99) <= 3) triggered = true;
      if (cond.type === "vip_customer" && data.isVip) triggered = true;
      if (cond.type === "time_of_day") {
        const [from, to] = cond.condition.split("-").map(Number);
        if ((data.hour ?? 12) >= from && (data.hour ?? 12) < to) triggered = true;
      }
      if (cond.type === "flash_sale") triggered = true;
      if (triggered) {
        const adj = cond.adjustmentType === "percent" ? (price * cond.adjustment) / 100 : cond.adjustment;
        price += adj;
        adjustments.push(cond.description);
      }
    }
    return { price: Math.max(0, Math.round(price)), adjustments };
  });

export const getPriceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("price_history")
      .select("*").eq("user_id", userId).order("changed_at", { ascending: false }).limit(100);
    return (data ?? []) as PriceHistory[];
  });

export const triggerFlashSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: z.string(), discountPercent: z.number().min(1).max(50), durationMinutes: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const endsAt = new Date(Date.now() + data.durationMinutes * 60000).toISOString();
    await db.from("pricing_rules").update({
      is_active: true,
      last_updated: new Date().toISOString(),
    }).eq("product_id", data.productId).eq("user_id", userId);
    await logAuditEvent({ data: { action: `Flash sale triggered: ${data.discountPercent}% off for ${data.durationMinutes}min`, targetType: "pricing", severity: "success" } });
    return { ok: true, endsAt };
  });
