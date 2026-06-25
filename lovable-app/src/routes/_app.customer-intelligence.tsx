import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, TrendingUp, AlertTriangle, Zap, MessageSquare, RefreshCw } from "lucide-react";
import type { RFMScore } from "@/lib/customer-intelligence.functions";

export const Route = createFileRoute("/_app/customer-intelligence")({
  component: CustomerIntelligencePage,
});

type Tab = "rfm" | "churn" | "hotleads";

const MOCK_RFM: RFMScore[] = [
  { customerId: "1", customerName: "Ahmed Khan", whatsapp: "03001234567", recency: 3, frequency: 15, monetary: 45000, rfmScore: 14, segment: "champion", churnRisk: "low", tags: ["VIP", "Big Spender"], predictedNextOrder: new Date(Date.now() + 7 * 86400000).toISOString() },
  { customerId: "2", customerName: "Sara Ali", whatsapp: "03111234567", recency: 8, frequency: 8, monetary: 22000, rfmScore: 12, segment: "loyal", churnRisk: "low", tags: ["Big Spender"] },
  { customerId: "3", customerName: "Bilal Raza", whatsapp: "03211234567", recency: 35, frequency: 5, monetary: 12000, rfmScore: 8, segment: "at_risk", churnRisk: "high", tags: ["Churn Risk"] },
  { customerId: "4", customerName: "Fatima Noor", whatsapp: "03321234567", recency: 22, frequency: 3, monetary: 6500, rfmScore: 7, segment: "potential", churnRisk: "medium", tags: [] },
  { customerId: "5", customerName: "Usman Shah", whatsapp: "03451234567", recency: 60, frequency: 2, monetary: 3000, rfmScore: 5, segment: "lost", churnRisk: "high", tags: ["Churn Risk"] },
];

const SEGMENT_COLORS: Record<string, string> = {
  champion: "bg-yellow-100 text-yellow-800",
  loyal: "bg-green-100 text-green-800",
  potential: "bg-blue-100 text-blue-800",
  at_risk: "bg-orange-100 text-orange-800",
  lost: "bg-red-100 text-red-800",
  new: "bg-purple-100 text-purple-800",
};

const CHURN_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

export default function CustomerIntelligencePage() {
  const [tab, setTab] = useState<Tab>("rfm");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: rfm = MOCK_RFM, isLoading } = useQuery({
    queryKey: ["customer-rfm"],
    queryFn: async () => { const { getCustomerRFM } = await import("@/lib/customer-intelligence.functions"); return getCustomerRFM(); },
    placeholderData: MOCK_RFM,
    staleTime: 60_000,
  });

  const { data: churn = [] } = useQuery({
    queryKey: ["churn-alerts"],
    queryFn: async () => { const { getChurnAlerts } = await import("@/lib/customer-intelligence.functions"); return getChurnAlerts(); },
    placeholderData: MOCK_RFM.filter(r => r.churnRisk === "high").map(r => ({ customerId: r.customerId, customerName: r.customerName, whatsapp: r.whatsapp, lastOrderDays: r.recency, avgOrderInterval: 30, riskScore: r.rfmScore * 6, suggestedAction: "Send win-back offer with 10% discount" })),
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["intelligence-stats"],
    queryFn: async () => { const { getIntelligenceStats } = await import("@/lib/customer-intelligence.functions"); return getIntelligenceStats(); },
    placeholderData: { totalCustomers: 142, champions: 18, atRisk: 24, hotLeads: 7, churnRiskRevenue: 85000 },
    staleTime: 60_000,
  });

  const filtered = rfm.filter((r) => !search || r.customerName?.toLowerCase().includes(search.toLowerCase()) || r.whatsapp?.includes(search));

  const segmentCounts = rfm.reduce<Record<string, number>>((acc, r) => { acc[r.segment] = (acc[r.segment] ?? 0) + 1; return acc; }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> AI Customer Intelligence</h1>
          <p className="text-muted-foreground text-sm">RFM scoring, churn prediction, hot lead detection</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ["customer-rfm"] })} className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Customers" value={stats?.totalCustomers ?? 0} icon={TrendingUp} color="bg-blue-100 text-blue-700" />
        <StatCard label="Champions" value={stats?.champions ?? 0} sub="VIP high-value" icon={TrendingUp} color="bg-yellow-100 text-yellow-700" />
        <StatCard label="At Risk" value={stats?.atRisk ?? 0} sub="May churn soon" icon={AlertTriangle} color="bg-orange-100 text-orange-700" />
        <StatCard label="Hot Leads" value={stats?.hotLeads ?? 0} sub="Buying signals" icon={Zap} color="bg-green-100 text-green-700" />
        <StatCard label="Churn Risk Revenue" value={`PKR ${((stats?.churnRiskRevenue ?? 0) / 1000).toFixed(0)}K`} sub="At risk" icon={AlertTriangle} color="bg-red-100 text-red-700" />
      </div>

      {/* Segment breakdown */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Customer Segments</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(segmentCounts).map(([seg, count]) => (
            <span key={seg} className={`px-3 py-1.5 rounded-full text-sm font-medium ${SEGMENT_COLORS[seg] ?? "bg-gray-100"}`}>
              {seg.replace("_", " ")} — {count}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["rfm","churn","hotleads"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "rfm" ? "RFM Scoring" : t === "churn" ? "Churn Alerts" : "Hot Leads"}
          </button>
        ))}
      </div>

      {tab === "rfm" && (
        <div className="space-y-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer…" className="w-full max-w-xs px-3 py-2 border rounded-lg text-sm bg-background" />
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  {["Customer","Segment","Churn Risk","Orders","Spend (PKR)","RFM Score","Next Order","Tags"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.customerId} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customerName ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{r.whatsapp}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEGMENT_COLORS[r.segment]}`}>{r.segment.replace("_"," ")}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHURN_COLORS[r.churnRisk]}`}>{r.churnRisk}</span></td>
                    <td className="px-4 py-3 text-center font-mono">{r.frequency}</td>
                    <td className="px-4 py-3 font-mono">{r.monetary.toLocaleString()}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><div className="h-2 bg-muted rounded-full flex-1"><div className="h-2 bg-primary rounded-full" style={{ width: `${(r.rfmScore / 15) * 100}%` }} /></div><span className="text-xs font-mono">{r.rfmScore}</span></div></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.predictedNextOrder ? new Date(r.predictedNextOrder).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">{t}</span>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "churn" && (
        <div className="space-y-3">
          {(churn as Array<{ customerId: string; customerName?: string; whatsapp?: string; lastOrderDays: number; avgOrderInterval: number; riskScore: number; suggestedAction: string }>).map((alert) => (
            <div key={alert.customerId} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold">{alert.customerName ?? "Unknown"}</div>
                <div className="text-xs text-muted-foreground mb-2">{alert.whatsapp} · Last order {alert.lastOrderDays} days ago (avg interval: {alert.avgOrderInterval}d)</div>
                <div className="text-sm text-muted-foreground bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  💡 {alert.suggestedAction}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${alert.riskScore > 70 ? "text-red-600" : alert.riskScore > 50 ? "text-orange-600" : "text-yellow-600"}`}>{alert.riskScore}%</div>
                <div className="text-xs text-muted-foreground">risk score</div>
                <button className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Message
                </button>
              </div>
            </div>
          ))}
          {churn.length === 0 && <div className="text-center py-12 text-muted-foreground">No churn alerts — all customers are active!</div>}
        </div>
      )}

      {tab === "hotleads" && (
        <div className="space-y-3">
          {[
            { customerName: "Adeel Ahmad", whatsapp: "03001122334", signal: "price_inquiry", confidence: 85, suggestedProduct: "ChatGPT Plus", suggestedPrice: 1500 },
            { customerName: "Maryam Iqbal", whatsapp: "03211122334", signal: "availability", confidence: 72, suggestedProduct: "Claude Pro", suggestedPrice: 1800 },
            { customerName: "Tariq Hassan", whatsapp: "03451122334", signal: "order", confidence: 95, suggestedProduct: "LinkedIn Premium", suggestedPrice: 2500 },
          ].map((lead, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold ${lead.confidence > 80 ? "bg-green-500" : "bg-yellow-500"}`}>
                {lead.confidence}%
              </div>
              <div className="flex-1">
                <div className="font-semibold">{lead.customerName}</div>
                <div className="text-xs text-muted-foreground">{lead.whatsapp} · Signal: <span className="font-medium">{lead.signal.replace("_"," ")}</span></div>
                <div className="text-sm mt-1">Suggest: <span className="font-medium text-primary">{lead.suggestedProduct}</span> @ PKR {lead.suggestedPrice?.toLocaleString()}</div>
              </div>
              <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Send Offer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
