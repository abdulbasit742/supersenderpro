import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  role: string;
  ordersClosedToday: number;
  ordersClosedMonth: number;
  revenueToday: number;
  revenueMonth: number;
  avgResponseMinutes: number;
  slaBreaches: number;
  customerRating: number;
  ticketsResolved: number;
  conversionRate: number;
  rank: number;
}

export interface TeamSummary {
  totalRevenue: number;
  totalOrders: number;
  avgResponseTime: number;
  slaComplianceRate: number;
  topAgent: string;
}

function makeAgent(i: number): AgentPerformance {
  const names = ["Imran Bhai","Ayesha","Usman Malik","Sana Support","Hassan Sales"];
  const roles = ["Senior Sales","Support Lead","Sales Executive","Support Agent","Sales Agent"];
  const rev = [45000, 38000, 29000, 15000, 22000];
  const orders = [12, 10, 8, 4, 6];
  return { agentId: `ag${i+1}`, agentName: names[i], role: roles[i], ordersClosedToday: orders[i], ordersClosedMonth: orders[i] * 28, revenueToday: rev[i], revenueMonth: rev[i] * 26, avgResponseMinutes: 5 + i * 8, slaBreaches: i * 2, customerRating: 4.9 - i * 0.2, ticketsResolved: 23 - i * 4, conversionRate: 78 - i * 8, rank: i + 1 };
}

const MOCK_AGENTS: AgentPerformance[] = Array.from({ length: 5 }, (_, i) => makeAgent(i));

export const getTeamPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_AGENTS);

export const getTeamSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<TeamSummary> => ({
    totalRevenue: MOCK_AGENTS.reduce((s, a) => s + a.revenueToday, 0),
    totalOrders: MOCK_AGENTS.reduce((s, a) => s + a.ordersClosedToday, 0),
    avgResponseTime: Math.round(MOCK_AGENTS.reduce((s, a) => s + a.avgResponseMinutes, 0) / MOCK_AGENTS.length),
    slaComplianceRate: 87,
    topAgent: MOCK_AGENTS[0].agentName,
  }));
