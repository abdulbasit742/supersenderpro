import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";

export interface CustomerLTV {
  customerId: string;
  customerName: string;
  whatsapp: string;
  firstOrderDate: string;
  lastOrderDate: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  orderFrequencyDays: number;
  predictedLTV: number;
  ltv90Days: number;
  segment: "champion" | "loyal" | "promising" | "at_risk" | "lost";
  tags: string[];
}

export interface LTVSummary {
  avgLTV: number;
  topCustomerLTV: number;
  totalCustomerRevenue: number;
  avgOrderValue: number;
  avgFrequencyDays: number;
  champions: number;
  atRisk: number;
}

function makeLTV(i: number): CustomerLTV {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik","Zara Baig","Omar Qureshi","Nadia Shah","Faisal Ahmed","Ayesha Butt","Tariq Mehmood","Sana Sheikh","Kamran Ali","Rubina Akhtar","Junaid Hassan"];
  const segs: CustomerLTV["segment"][] = ["champion","champion","loyal","loyal","promising","promising","at_risk","lost","champion","loyal","promising","at_risk","champion","loyal","promising"];
  const orders = [42, 38, 29, 24, 18, 15, 12, 8, 35, 27, 20, 9, 45, 31, 16];
  const aov = [3800, 2900, 3200, 4100, 2600, 3500, 2200, 1800, 4200, 3100, 2800, 2400, 3600, 3300, 2700];
  return { customerId: `c${i+1}`, customerName: names[i], whatsapp: `030${i}1234567`, firstOrderDate: new Date(Date.now() - (180 + i * 10) * 86400000).toISOString(), lastOrderDate: new Date(Date.now() - i * 7 * 86400000).toISOString(), totalOrders: orders[i], totalRevenue: orders[i] * aov[i], avgOrderValue: aov[i], orderFrequencyDays: Math.round(180 / orders[i]), predictedLTV: orders[i] * aov[i] * 1.4, ltv90Days: Math.round(orders[i] * aov[i] * 0.5), segment: segs[i], tags: i < 3 ? ["VIP","Bulk Buyer"] : i < 7 ? ["Regular"] : ["Inactive"] };
}

const MOCK_LTV: CustomerLTV[] = Array.from({ length: 15 }, (_, i) => makeLTV(i)).sort((a, b) => b.totalRevenue - a.totalRevenue);

export const getCustomerLTV = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_LTV);

export const getLTVSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<LTVSummary> => ({
    avgLTV: Math.round(MOCK_LTV.reduce((s, c) => s + c.totalRevenue, 0) / MOCK_LTV.length),
    topCustomerLTV: MOCK_LTV[0].totalRevenue,
    totalCustomerRevenue: MOCK_LTV.reduce((s, c) => s + c.totalRevenue, 0),
    avgOrderValue: Math.round(MOCK_LTV.reduce((s, c) => s + c.avgOrderValue, 0) / MOCK_LTV.length),
    avgFrequencyDays: Math.round(MOCK_LTV.reduce((s, c) => s + c.orderFrequencyDays, 0) / MOCK_LTV.length),
    champions: MOCK_LTV.filter(c => c.segment === "champion").length,
    atRisk: MOCK_LTV.filter(c => c.segment === "at_risk" || c.segment === "lost").length,
  }));
