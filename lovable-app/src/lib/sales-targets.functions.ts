import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SalesTarget {
  id: string;
  period: "daily" | "weekly" | "monthly";
  targetDate: string;
  revenueTarget: number;
  orderCountTarget: number;
  newCustomerTarget: number;
  revenueActual: number;
  orderCountActual: number;
  newCustomerActual: number;
  status: "on_track" | "at_risk" | "behind" | "achieved";
}

export interface TargetConfig {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  dailyOrders: number;
  weeklyOrders: number;
  monthlyOrders: number;
  newCustomersMonthly: number;
  alertBelowPercent: number;
}

const DEFAULT_CONFIG: TargetConfig = { dailyRevenue: 15000, weeklyRevenue: 90000, monthlyRevenue: 350000, dailyOrders: 5, weeklyOrders: 30, monthlyOrders: 120, newCustomersMonthly: 25, alertBelowPercent: 70 };

function makeTarget(period: SalesTarget["period"], offsetDays: number): SalesTarget {
  const d = new Date(); d.setDate(d.getDate() - offsetDays);
  const rev = period === "daily" ? 15000 : period === "weekly" ? 90000 : 350000;
  const actual = Math.round(rev * (0.6 + Math.random() * 0.6));
  const pct = (actual / rev) * 100;
  const status: SalesTarget["status"] = pct >= 100 ? "achieved" : pct >= 80 ? "on_track" : pct >= 60 ? "at_risk" : "behind";
  return { id: `t_${period}_${offsetDays}`, period, targetDate: d.toISOString(), revenueTarget: rev, orderCountTarget: period === "daily" ? 5 : period === "weekly" ? 30 : 120, newCustomerTarget: period === "monthly" ? 25 : 0, revenueActual: actual, orderCountActual: Math.round(actual / 3500), newCustomerActual: period === "monthly" ? Math.round(8 + Math.random() * 20) : 0, status };
}

const MOCK_TARGETS: SalesTarget[] = [
  makeTarget("daily", 0), makeTarget("daily", 1), makeTarget("daily", 2), makeTarget("daily", 3), makeTarget("daily", 4), makeTarget("daily", 5), makeTarget("daily", 6),
  makeTarget("weekly", 0), makeTarget("weekly", 7), makeTarget("weekly", 14),
  makeTarget("monthly", 0), makeTarget("monthly", 30),
];

export const getTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ period: z.enum(["daily","weekly","monthly"]).optional() }).parse(d))
  .handler(async ({ data }) => data.period ? MOCK_TARGETS.filter(t => t.period === data.period) : MOCK_TARGETS);

export const getTargetConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.targetConfig ?? DEFAULT_CONFIG) as TargetConfig;
  });

export const saveTargetConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, targetConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });

export const getTodayProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data: orders } = await supabase.from("orders").select("sell_price, created_at").eq("user_id", userId).gte("created_at", todayStart.toISOString());
    const revenue = orders?.reduce((s, o) => s + Number(o.sell_price ?? 0), 0) ?? 0;
    const orderCount = orders?.length ?? 0;
    return { revenue, orderCount, asOf: new Date().toISOString() };
  });
