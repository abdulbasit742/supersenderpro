import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface CommissionRecord {
  id: string;
  agentId: string;
  agentName: string;
  orderId: string;
  product: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid";
  earnedAt: string;
  paidAt?: string;
}

export interface AgentCommissionSummary {
  agentId: string;
  agentName: string;
  commissionRate: number;
  pendingAmount: number;
  approvedAmount: number;
  paidThisMonth: number;
  totalEarned: number;
}

function makeComm(i: number): CommissionRecord {
  const agents = ["Imran Bhai","Ayesha","Usman Malik","Sana Support","Hassan Sales"];
  const products = ["ChatGPT Plus","Netflix Premium","Canva Pro","Midjourney Pro","Adobe CC"];
  const amounts = [3500, 2500, 1800, 4200, 5500];
  const rate = [10, 8, 10, 8, 10][i % 5];
  const sale = amounts[i % 5];
  const statuses: CommissionRecord["status"][] = ["pending","approved","paid","paid","pending","approved","paid","paid","pending","approved"];
  const d = new Date(); d.setDate(d.getDate() - i * 2);
  return { id: `cm${i+1}`, agentId: `ag${(i % 5)+1}`, agentName: agents[i % 5], orderId: `ORD-${4500 - i}`, product: products[i % 5], saleAmount: sale, commissionRate: rate, commissionAmount: Math.round(sale * rate / 100), status: statuses[i % statuses.length], earnedAt: d.toISOString(), paidAt: statuses[i % statuses.length] === "paid" ? new Date(d.getTime() + 86400000).toISOString() : undefined };
}

const MOCK_COMMISSIONS: CommissionRecord[] = Array.from({ length: 20 }, (_, i) => makeComm(i));

const MOCK_SUMMARIES: AgentCommissionSummary[] = [
  { agentId: "ag1", agentName: "Imran Bhai", commissionRate: 10, pendingAmount: 4200, approvedAmount: 8400, paidThisMonth: 32000, totalEarned: 89000 },
  { agentId: "ag2", agentName: "Ayesha", commissionRate: 8, pendingAmount: 1600, approvedAmount: 3200, paidThisMonth: 18000, totalEarned: 42000 },
  { agentId: "ag3", agentName: "Usman Malik", commissionRate: 10, pendingAmount: 2800, approvedAmount: 5600, paidThisMonth: 24000, totalEarned: 61000 },
];

export const getCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ agentId: z.string().optional(), status: z.string().optional() }))
  .handler(async ({ data }) => {
    let result = MOCK_COMMISSIONS;
    if (data.agentId) result = result.filter(c => c.agentId === data.agentId);
    if (data.status && data.status !== "all") result = result.filter(c => c.status === data.status);
    return result;
  });

export const getCommissionSummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_SUMMARIES);

export const approveCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ commissionIds: z.array(z.string()) }))
  .handler(async ({ data }) => ({ success: true, approved: data.commissionIds.length }));

export const payCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ agentId: z.string(), amount: z.number(), method: z.string() }))
  .handler(async ({ data }) => ({ success: true, agentId: data.agentId, amount: data.amount, method: data.method, note: "Demo: Commission payout recorded" }));
