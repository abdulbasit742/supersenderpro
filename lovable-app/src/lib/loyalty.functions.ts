import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface LoyaltyMember {
  id: string;
  customerId: string;
  customerName?: string;
  whatsapp?: string;
  points: number;
  tier: LoyaltyTier;
  totalSpend: number;
  referralCode: string;
  referralCount: number;
  referralEarned: number;
  joinedAt: string;
}

export interface LoyaltyConfig {
  pointsPerPkr: number;        // e.g. 1 point per PKR 10
  tiers: Record<LoyaltyTier, { minPoints: number; discount: number; label: string }>;
  referralBonus: number;       // points per referral
  referralDiscount: number;    // PKR discount for referred friend's first order
  birthdayBonus: number;
}

export interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
  isActive: boolean;
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  pointsPerPkr: 1,
  tiers: {
    bronze:   { minPoints: 0,    discount: 0,  label: "Bronze" },
    silver:   { minPoints: 500,  discount: 5,  label: "Silver" },
    gold:     { minPoints: 2000, discount: 10, label: "Gold" },
    platinum: { minPoints: 5000, discount: 15, label: "Platinum" },
  },
  referralBonus: 200,
  referralDiscount: 150,
  birthdayBonus: 100,
};

function getTier(points: number, config: LoyaltyConfig): LoyaltyTier {
  if (points >= config.tiers.platinum.minPoints) return "platinum";
  if (points >= config.tiers.gold.minPoints) return "gold";
  if (points >= config.tiers.silver.minPoints) return "silver";
  return "bronze";
}

function makeReferralCode(name: string, id: string): string {
  return (name.substring(0, 3).toUpperCase() + id.substring(0, 4)).replace(/[^A-Z0-9]/g, "X");
}

export const getLoyaltyMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("loyalty_members")
      .select("*, customers(name, whatsapp)").eq("user_id", userId).order("points", { ascending: false });

    const { data: cfgRow } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const cfg = ((cfgRow?.settings as Record<string, unknown>)?.loyaltyConfig ?? DEFAULT_CONFIG) as LoyaltyConfig;

    return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
      id: String(m.id),
      customerId: String(m.customer_id),
      customerName: (m.customers as Record<string, unknown> | null)?.name as string | undefined,
      whatsapp: (m.customers as Record<string, unknown> | null)?.whatsapp as string | undefined,
      points: Number(m.points) || 0,
      tier: getTier(Number(m.points) || 0, cfg),
      totalSpend: Number(m.total_spend) || 0,
      referralCode: String(m.referral_code ?? makeReferralCode(String(m.customer_id), String(m.id))),
      referralCount: Number(m.referral_count) || 0,
      referralEarned: Number(m.referral_earned) || 0,
      joinedAt: String(m.joined_at ?? m.created_at ?? ""),
    })) as LoyaltyMember[];
  });

export const getLoyaltyConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.loyaltyConfig ?? DEFAULT_CONFIG) as LoyaltyConfig;
  });

export const saveLoyaltyConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, loyaltyConfig: data } }, { onConflict: "user_id" });
    await logAuditEvent({ data: { action: "Loyalty config saved", targetType: "loyalty_config", severity: "info" } });
    return { ok: true };
  });

export const awardPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ customerId: z.string().uuid(), points: z.number().int().positive(), reason: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: existing } = await db.from("loyalty_members").select("id, points, customer_id").eq("customer_id", data.customerId).eq("user_id", userId).single();

    if (existing) {
      await db.from("loyalty_members").update({ points: (Number((existing as Record<string, unknown>).points) || 0) + data.points }).eq("id", (existing as Record<string, unknown>).id);
    } else {
      const { data: cust } = await supabase.from("customers").select("name").eq("id", data.customerId).single();
      await db.from("loyalty_members").insert({ user_id: userId, customer_id: data.customerId, points: data.points, total_spend: 0, referral_code: makeReferralCode(cust?.name ?? "USR", data.customerId), referral_count: 0, referral_earned: 0, joined_at: new Date().toISOString() });
    }
    await logAuditEvent({ data: { action: `Points awarded: ${data.points}`, target: data.customerId, targetType: "loyalty", severity: "success" } });
    return { ok: true };
  });

export const getRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("loyalty_rewards").select("*").eq("user_id", userId).eq("is_active", true);
    return (data ?? []) as Reward[];
  });

export const saveReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    pointsCost: z.number().int().positive(),
    description: z.string().max(300).optional(),
    isActive: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    if (data.id) {
      const { data: r } = await db.from("loyalty_rewards").update({ name: data.name, points_cost: data.pointsCost, description: data.description, is_active: data.isActive ?? true }).eq("id", data.id).eq("user_id", userId).select().single();
      return r;
    }
    const { data: r } = await db.from("loyalty_rewards").insert({ user_id: userId, name: data.name, points_cost: data.pointsCost, description: data.description, is_active: true }).select().single();
    return r;
  });
