import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface ChurnRisk {
  customerId: string;
  customerName: string;
  whatsapp: string;
  riskScore: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  lastOrderDays: number;
  totalOrders: number;
  avgOrderInterval: number;
  daysOverdue: number;
  lastProduct: string;
  predictedChurnDate: string;
  signals: string[];
  rescueSent: boolean;
}

export interface ChurnSummary {
  totalAtRisk: number;
  critical: number;
  high: number;
  medium: number;
  estimatedRevenueLoss: number;
  avgChurnScore: number;
}

function makeRisk(i: number): ChurnRisk {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik","Zara Baig","Omar Qureshi","Nadia Shah","Faisal Ahmed","Ayesha Butt","Tariq Mehmood","Sana Sheikh"];
  const products = ["ChatGPT Plus","Midjourney Pro","Netflix Premium","Canva Pro","Adobe CC","LinkedIn Premium"];
  const score = Math.round(30 + (i * 6.5));
  const level = score >= 80 ? "critical" : score >= 65 ? "high" : score >= 45 ? "medium" : "low";
  const signals: string[] = [];
  if (score > 70) signals.push("No purchase in 45+ days");
  if (score > 60) signals.push("Last 2 renewals delayed");
  if (score > 50) signals.push("Support ticket unresolved");
  if (score > 80) signals.push("Competitor pricing inquiry");
  return { customerId: `c${i+1}`, customerName: names[i % names.length], whatsapp: `030${i}1234567`, riskScore: score, riskLevel: level, lastOrderDays: 15 + i * 5, totalOrders: 20 - i, avgOrderInterval: 28 + i * 2, daysOverdue: Math.max(0, i * 3 - 10), lastProduct: products[i % products.length], predictedChurnDate: new Date(Date.now() + (30 - i * 3) * 86400000).toISOString(), signals, rescueSent: i % 4 === 0 };
}

const MOCK_RISKS: ChurnRisk[] = Array.from({ length: 12 }, (_, i) => makeRisk(i)).sort((a, b) => b.riskScore - a.riskScore);

export const getChurnRisks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_RISKS);

export const getChurnSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ChurnSummary> => ({
    totalAtRisk: MOCK_RISKS.length,
    critical: MOCK_RISKS.filter(r => r.riskLevel === "critical").length,
    high: MOCK_RISKS.filter(r => r.riskLevel === "high").length,
    medium: MOCK_RISKS.filter(r => r.riskLevel === "medium").length,
    estimatedRevenueLoss: 184500,
    avgChurnScore: Math.round(MOCK_RISKS.reduce((s, r) => s + r.riskScore, 0) / MOCK_RISKS.length),
  }));

export const sendRescueCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ customerIds: z.array(z.string()), message: z.string() }))
  .handler(async ({ data }) => ({ success: true, sent: data.customerIds.length, note: "Demo: Rescue messages queued via WhatsApp" }));
