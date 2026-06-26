import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Crown, AlertCircle } from "lucide-react";
import type { CustomerLTV } from "@/lib/customer-ltv.functions";

export const Route = createFileRoute("/_app/customer-ltv")({
  component: CustomerLTVPage,
});

function makeLTV(i: number): CustomerLTV {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik","Zara Baig","Omar Qureshi","Nadia Shah","Faisal Ahmed","Ayesha Butt","Tariq Mehmood","Sana Sheikh","Kamran Ali","Rubina Akhtar","Junaid Hassan"];
  const segs: CustomerLTV["segment"][] = ["champion","champion","loyal","loyal","promising","promising","at_risk","lost","champion","loyal","promising","at_risk","champion","loyal","promising"];
  const orders = [42,38,29,24,18,15,12,8,35,27,20,9,45,31,16];
  const aov = [3800,2900,3200,4100,2600,3500,2200,1800,4200,3100,2800,2400,3600,3300,2700];
  return { customerId: `c${i+1}`, customerName: names[i], whatsapp: `030${i}1234567`, firstOrderDate: new Date(Date.now() - (180 + i*10)*86400000).toISOString(), lastOrderDate: new Date(Date.now() - i*7*86400000).toISOString(), totalOrders: orders[i], totalRevenue: orders[i]*aov[i], avgOrderValue: aov[i], orderFrequencyDays: Math.round(180/orders[i]), predictedLTV: orders[i]*aov[i]*1.4, ltv90Days: Math.round(orders[i]*aov[i]*0.5), segment: segs[i], tags: i<3?["VIP","Bulk Buyer"]:i<7?["Regular"]:["Inactive"] };
}
const MOCK_LTV: CustomerLTV[] = Array.from({ length: 15 }, (_,i) => makeLTV(i)).sort((a,b) => b.totalRevenue - a.totalRevenue);

const SEG_COLORS: Record<CustomerLTV["segment"], string> = { champion: "bg-yellow-100 text-yellow-800", loyal: "bg-green-100 text-green-700", promising: "bg-blue-100 text-blue-700", at_risk: "bg-orange-100 text-orange-700", lost: "bg-red-100 text-red-700" };
const SEG_ICONS: Record<CustomerLTV["segment"], string> = { champion: "👑", loyal: "⭐", promising: "🌱", at_risk: "⚠️", lost: "💤" };

export default function CustomerLTVPage() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"revenue" | "ltv" | "frequency">("revenue");

  const { data: customers = MOCK_LTV } = useQuery({ queryKey: ["customer-ltv"], queryFn: async () => { const { getCustomerLTV } = await import("@/lib/customer-ltv.functions"); return getCustomerLTV(); }, placeholderData: MOCK_LTV, staleTime: 60_000 });

  const filtered = (customers as typeof MOCK_LTV).filter(c => filter === "all" || c.segment === filter).sort((a, b) => sort === "ltv" ? b.predictedLTV - a.predictedLTV : sort === "frequency" ? a.orderFrequencyDays - b.orderFrequencyDays : b.totalRevenue - a.totalRevenue);
  const totalRevenue = MOCK_LTV.reduce((s, c) => s + c.totalRevenue, 0);
  const avgLTV = Math.round(totalRevenue / MOCK_LTV.length);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> Customer Lifetime Value</h1><p className="text-muted-foreground text-sm">See which customers are most valuable — predict future revenue, identify at-risk buyers</p></div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-3 text-center"><Crown className="h-5 w-5 text-yellow-600 mx-auto mb-1" /><div className="text-lg font-bold text-yellow-800">PKR {(MOCK_LTV[0].totalRevenue/1000).toFixed(0)}K</div><div className="text-xs text-yellow-700">Top Customer</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-lg font-bold">PKR {(avgLTV/1000).toFixed(0)}K</div><div className="text-xs text-muted-foreground">Avg LTV</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{MOCK_LTV.filter(c => c.segment === "champion").length}</div><div className="text-xs text-green-600">Champions</div></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><AlertCircle className="h-4 w-4 text-red-500 mx-auto mb-0.5" /><div className="text-2xl font-bold text-red-700">{MOCK_LTV.filter(c => c.segment === "at_risk" || c.segment === "lost").length}</div><div className="text-xs text-red-600">At Risk</div></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {["all","champion","loyal","promising","at_risk","lost"].map(s => <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{s === "all" ? "All" : `${SEG_ICONS[s as CustomerLTV["segment"]] ?? ""} ${s.replace("_"," ")}`}</button>)}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="ml-auto px-2 py-1.5 border rounded-lg text-xs bg-background">
          <option value="revenue">Sort: Revenue</option>
          <option value="ltv">Sort: Predicted LTV</option>
          <option value="frequency">Sort: Frequency</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((c, i) => (
          <div key={c.customerId} className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{i + 1}</div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5"><span className="font-semibold">{c.customerName}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEG_COLORS[c.segment]}`}>{SEG_ICONS[c.segment]} {c.segment.replace("_"," ")}</span></div>
                  <div className="text-xs text-muted-foreground">{c.whatsapp} · {c.totalOrders} orders · every {c.orderFrequencyDays}d</div>
                  <div className="flex gap-1 mt-1">{c.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded">{t}</span>)}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-lg">PKR {(c.totalRevenue/1000).toFixed(0)}K</div>
                <div className="text-xs text-muted-foreground">Total Revenue</div>
                <div className="text-xs text-primary mt-0.5">Pred. PKR {(c.predictedLTV/1000).toFixed(0)}K</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-muted/30 rounded p-1"><div className="font-semibold">PKR {c.avgOrderValue.toLocaleString()}</div><div className="text-muted-foreground">AOV</div></div>
              <div className="bg-muted/30 rounded p-1"><div className="font-semibold">PKR {(c.ltv90Days/1000).toFixed(0)}K</div><div className="text-muted-foreground">LTV 90d</div></div>
              <div className="bg-muted/30 rounded p-1"><div className="font-semibold">{new Date(c.lastOrderDate).toLocaleDateString()}</div><div className="text-muted-foreground">Last Order</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
