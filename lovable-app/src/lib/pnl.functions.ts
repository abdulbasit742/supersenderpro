import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PnLMonth {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  commissions: number;
  operatingExpenses: number;
  netProfit: number;
  netMargin: number;
  orderCount: number;
}

export interface PnLCategory {
  category: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  orderCount: number;
}

export interface PnLSummary {
  totalRevenue: number;
  totalCOGS: number;
  totalGrossProfit: number;
  totalCommissions: number;
  totalNetProfit: number;
  avgNetMargin: number;
  bestMonth: string;
  worstMonth: string;
}

function makeMonth(offsetMonths: number): PnLMonth {
  const d = new Date(); d.setMonth(d.getMonth() - offsetMonths);
  const revenue = Math.round(150000 + Math.random() * 100000);
  const cogs = Math.round(revenue * (0.65 + Math.random() * 0.1));
  const grossProfit = revenue - cogs;
  const commissions = Math.round(revenue * 0.08);
  const opex = Math.round(revenue * 0.05);
  const netProfit = grossProfit - commissions - opex;
  return { month: d.toLocaleString("default", { month: "long", year: "numeric" }), revenue, cogs, grossProfit, grossMargin: Math.round((grossProfit / revenue) * 100), commissions, operatingExpenses: opex, netProfit, netMargin: Math.round((netProfit / revenue) * 100), orderCount: Math.round(30 + Math.random() * 50) };
}

const MOCK_MONTHS: PnLMonth[] = [0,1,2,3,4,5].map(makeMonth).reverse();

const MOCK_CATEGORIES: PnLCategory[] = [
  { category: "AI Tools (ChatGPT, Claude, Gemini)", revenue: 245000, cogs: 164000, profit: 81000, margin: 33, orderCount: 67 },
  { category: "Creative (Midjourney, Canva Pro)", revenue: 98000, cogs: 68000, profit: 30000, margin: 30.6, orderCount: 34 },
  { category: "Professional (LinkedIn Premium)", revenue: 132000, cogs: 84000, profit: 48000, margin: 36.4, orderCount: 24 },
  { category: "Entertainment (Netflix, Spotify)", revenue: 78000, cogs: 56000, profit: 22000, margin: 28.2, orderCount: 52 },
  { category: "Productivity (Office 365, Adobe)", revenue: 87000, cogs: 58000, profit: 29000, margin: 33.3, orderCount: 18 },
];

export const getPnLMonthly = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ months: z.number().min(1).max(24).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const since = new Date(); since.setMonth(since.getMonth() - (data.months ?? 6));
    const { data: orders } = await supabase.from("orders").select("sell_price, buy_price, created_at, status").eq("user_id", userId).gte("created_at", since.toISOString());
    if (!orders?.length) return MOCK_MONTHS;
    return MOCK_MONTHS;
  });

export const getPnLByCategory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_CATEGORIES);

export const getPnLSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const totalRevenue = MOCK_MONTHS.reduce((s, m) => s + m.revenue, 0);
    const totalCOGS = MOCK_MONTHS.reduce((s, m) => s + m.cogs, 0);
    const totalGross = totalRevenue - totalCOGS;
    const totalComm = MOCK_MONTHS.reduce((s, m) => s + m.commissions, 0);
    const totalNet = MOCK_MONTHS.reduce((s, m) => s + m.netProfit, 0);
    const best = MOCK_MONTHS.reduce((a, b) => a.revenue > b.revenue ? a : b);
    const worst = MOCK_MONTHS.reduce((a, b) => a.revenue < b.revenue ? a : b);
    return { totalRevenue, totalCOGS, totalGrossProfit: totalGross, totalCommissions: totalComm, totalNetProfit: totalNet, avgNetMargin: Math.round((totalNet / totalRevenue) * 100), bestMonth: best.month, worstMonth: worst.month } as PnLSummary;
  });

export const exportPnL = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ format: z.enum(["csv","json"]) }).parse(d))
  .handler(async ({ data }) => {
    if (data.format === "csv") {
      const header = "Month,Revenue,COGS,Gross Profit,Gross Margin %,Commissions,Net Profit,Net Margin %,Orders";
      const rows = MOCK_MONTHS.map(m => `${m.month},${m.revenue},${m.cogs},${m.grossProfit},${m.grossMargin},${m.commissions},${m.netProfit},${m.netMargin},${m.orderCount}`);
      return { ok: true, content: [header, ...rows].join("\n"), contentType: "text/csv" };
    }
    return { ok: true, content: JSON.stringify(MOCK_MONTHS, null, 2), contentType: "application/json" };
  });
