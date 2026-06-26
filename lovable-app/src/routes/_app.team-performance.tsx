import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Star, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import type { AgentPerformance } from "@/lib/team-performance.functions";

export const Route = createFileRoute("/_app/team-performance")({
  component: TeamPerformancePage,
});

function makeAgent(i: number): AgentPerformance {
  const names = ["Imran Bhai","Ayesha","Usman Malik","Sana Support","Hassan Sales"];
  const roles = ["Senior Sales","Support Lead","Sales Executive","Support Agent","Sales Agent"];
  const rev = [45000,38000,29000,15000,22000];
  const orders = [12,10,8,4,6];
  return { agentId: `ag${i+1}`, agentName: names[i], role: roles[i], ordersClosedToday: orders[i], ordersClosedMonth: orders[i]*28, revenueToday: rev[i], revenueMonth: rev[i]*26, avgResponseMinutes: 5+i*8, slaBreaches: i*2, customerRating: 4.9-i*0.2, ticketsResolved: 23-i*4, conversionRate: 78-i*8, rank: i+1 };
}
const MOCK_AGENTS: AgentPerformance[] = Array.from({ length: 5 }, (_, i) => makeAgent(i));

const MEDAL = ["🥇","🥈","🥉","4️⃣","5️⃣"];

export default function TeamPerformancePage() {
  const { data: agents = MOCK_AGENTS } = useQuery({ queryKey: ["team-performance"], queryFn: async () => { const { getTeamPerformance } = await import("@/lib/team-performance.functions"); return getTeamPerformance(); }, placeholderData: MOCK_AGENTS, staleTime: 30_000 });

  const totalRevenue = (agents as typeof MOCK_AGENTS).reduce((s, a) => s + a.revenueToday, 0);
  const totalOrders = (agents as typeof MOCK_AGENTS).reduce((s, a) => s + a.ordersClosedToday, 0);
  const avgResponse = Math.round((agents as typeof MOCK_AGENTS).reduce((s, a) => s + a.avgResponseMinutes, 0) / agents.length);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Team Performance</h1><p className="text-muted-foreground text-sm">Agent leaderboard, SLA compliance, conversion rates — today's snapshot</p></div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-lg font-bold text-green-700">PKR {(totalRevenue/1000).toFixed(0)}K</div><div className="text-xs text-green-600">Team Revenue Today</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{totalOrders}</div><div className="text-xs text-muted-foreground">Orders Closed Today</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{avgResponse}m</div><div className="text-xs text-muted-foreground">Avg Response Time</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">87%</div><div className="text-xs text-blue-600">SLA Compliance</div></div>
      </div>

      <div className="space-y-3">
        {(agents as typeof MOCK_AGENTS).map((agent, i) => (
          <div key={agent.agentId} className={`bg-card border-2 rounded-xl p-4 ${i === 0 ? "border-yellow-300 bg-yellow-50/30" : "border-border"}`}>
            <div className="flex items-start gap-4">
              <div className="text-2xl shrink-0">{MEDAL[i]}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div><span className="font-bold">{agent.agentName}</span><span className="text-sm text-muted-foreground ml-2">{agent.role}</span></div>
                  <div className="flex items-center gap-1 text-yellow-600"><Star className="h-4 w-4 fill-current" /><span className="font-semibold">{agent.customerRating.toFixed(1)}</span></div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-green-50 rounded-lg p-2"><div className="font-bold text-green-700">PKR {(agent.revenueToday/1000).toFixed(0)}K</div><div className="text-muted-foreground">Rev Today</div></div>
                  <div className="bg-blue-50 rounded-lg p-2"><div className="font-bold text-blue-700">{agent.ordersClosedToday}</div><div className="text-muted-foreground">Orders</div></div>
                  <div className="bg-purple-50 rounded-lg p-2"><div className="font-bold text-purple-700">{agent.conversionRate}%</div><div className="text-muted-foreground">Conversion</div></div>
                  <div className={`rounded-lg p-2 ${agent.avgResponseMinutes > 20 ? "bg-orange-50" : "bg-card"}`}><div className={`font-bold ${agent.avgResponseMinutes > 20 ? "text-orange-600" : ""}`}>{agent.avgResponseMinutes}m</div><div className="text-muted-foreground">Resp. Time</div></div>
                  <div className={`rounded-lg p-2 ${agent.slaBreaches > 0 ? "bg-red-50" : "bg-card"}`}><div className="flex items-center justify-center gap-0.5">{agent.slaBreaches > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}<span className={`font-bold ${agent.slaBreaches > 0 ? "text-red-600" : ""}`}>{agent.slaBreaches}</span></div><div className="text-muted-foreground">SLA Breach</div></div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Monthly Revenue:</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(agent.revenueMonth / MOCK_AGENTS[0].revenueMonth * 100)}%` }} /></div>
                  <div className="text-xs font-medium">PKR {(agent.revenueMonth/1000).toFixed(0)}K</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
