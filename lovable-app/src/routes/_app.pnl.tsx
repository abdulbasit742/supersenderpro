import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, TrendingDown, Download, BarChart2, DollarSign } from "lucide-react";
import type { PnLMonth, PnLCategory, PnLSummary } from "@/lib/pnl.functions";

export const Route = createFileRoute("/_app/pnl")({
  component: PnLPage,
});

type Tab = "monthly" | "category" | "summary";

function makeMonth(off: number) {
  const d = new Date(); d.setMonth(d.getMonth() - off);
  const rev = Math.round(150000 + Math.random() * 100000);
  const cogs = Math.round(rev * 0.68);
  const gross = rev - cogs; const comm = Math.round(rev * 0.08); const opex = Math.round(rev * 0.05); const net = gross - comm - opex;
  return { month: d.toLocaleString("default", { month: "short", year: "numeric" }), revenue: rev, cogs, grossProfit: gross, grossMargin: Math.round((gross/rev)*100), commissions: comm, operatingExpenses: opex, netProfit: net, netMargin: Math.round((net/rev)*100), orderCount: Math.round(30 + Math.random() * 50) };
}
const MOCK_MONTHS: PnLMonth[] = [0,1,2,3,4,5].map(makeMonth).reverse();
const MOCK_CATS: PnLCategory[] = [
  { category: "AI Tools", revenue: 245000, cogs: 164000, profit: 81000, margin: 33, orderCount: 67 },
  { category: "Creative Tools", revenue: 98000, cogs: 68000, profit: 30000, margin: 30.6, orderCount: 34 },
  { category: "Professional", revenue: 132000, cogs: 84000, profit: 48000, margin: 36.4, orderCount: 24 },
  { category: "Entertainment", revenue: 78000, cogs: 56000, profit: 22000, margin: 28.2, orderCount: 52 },
];
const MOCK_SUMMARY: PnLSummary = { totalRevenue: MOCK_MONTHS.reduce((s,m)=>s+m.revenue,0), totalCOGS: MOCK_MONTHS.reduce((s,m)=>s+m.cogs,0), totalGrossProfit: MOCK_MONTHS.reduce((s,m)=>s+m.grossProfit,0), totalCommissions: MOCK_MONTHS.reduce((s,m)=>s+m.commissions,0), totalNetProfit: MOCK_MONTHS.reduce((s,m)=>s+m.netProfit,0), avgNetMargin: 19, bestMonth: MOCK_MONTHS[MOCK_MONTHS.length-1].month, worstMonth: MOCK_MONTHS[0].month };

const maxRev = Math.max(...MOCK_MONTHS.map(m => m.revenue));

export default function PnLPage() {
  const [tab, setTab] = useState<Tab>("monthly");

  const { data: months = MOCK_MONTHS } = useQuery({ queryKey: ["pnl-monthly"], queryFn: async () => { const { getPnLMonthly } = await import("@/lib/pnl.functions"); return getPnLMonthly({ data: {} }); }, placeholderData: MOCK_MONTHS, staleTime: 300_000 });
  const { data: cats = MOCK_CATS } = useQuery({ queryKey: ["pnl-category"], queryFn: async () => { const { getPnLByCategory } = await import("@/lib/pnl.functions"); return getPnLByCategory(); }, placeholderData: MOCK_CATS, staleTime: 300_000 });
  const { data: summary = MOCK_SUMMARY } = useQuery({ queryKey: ["pnl-summary"], queryFn: async () => { const { getPnLSummary } = await import("@/lib/pnl.functions"); return getPnLSummary(); }, placeholderData: MOCK_SUMMARY, staleTime: 300_000 });

  const downloadCSV = () => {
    const header = "Month,Revenue,COGS,Gross Profit,Gross Margin%,Commissions,Net Profit,Net Margin%,Orders";
    const rows = months.map(m => `${m.month},${m.revenue},${m.cogs},${m.grossProfit},${m.grossMargin},${m.commissions},${m.netProfit},${m.netMargin},${m.orderCount}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "pnl-report.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart2 className="h-6 w-6 text-primary" /> Profit & Loss Report</h1>
          <p className="text-muted-foreground text-sm">Revenue, COGS, commissions, and net profit — monthly breakdown</p>
        </div>
        <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-accent"><Download className="h-4 w-4" />Export CSV</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Revenue", value: `PKR ${(summary.totalRevenue/1000).toFixed(0)}K`, color: "text-primary" },
          { label: "Total COGS", value: `PKR ${(summary.totalCOGS/1000).toFixed(0)}K`, color: "text-red-600" },
          { label: "Gross Profit", value: `PKR ${(summary.totalGrossProfit/1000).toFixed(0)}K`, color: "text-blue-600" },
          { label: "Commissions", value: `PKR ${(summary.totalCommissions/1000).toFixed(0)}K`, color: "text-orange-600" },
          { label: "Net Profit", value: `PKR ${(summary.totalNetProfit/1000).toFixed(0)}K`, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3 text-center"><div className={`text-xl font-bold ${color}`}>{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {(["monthly","category","summary"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "monthly" ? "Monthly Breakdown" : t === "category" ? "By Category" : "Summary"}</button>)}
      </div>

      {tab === "monthly" && (
        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Revenue vs Net Profit</h3>
            <div className="space-y-3">
              {months.map(m => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{m.month}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2"><div className="flex-1 h-4 bg-muted rounded overflow-hidden"><div className="h-4 bg-primary rounded" style={{ width: `${(m.revenue/maxRev)*100}%` }} /></div><span className="text-xs font-medium w-20 text-right">PKR {(m.revenue/1000).toFixed(0)}K</span></div>
                    <div className="flex items-center gap-2"><div className="flex-1 h-2 bg-muted rounded overflow-hidden"><div className="h-2 bg-green-500 rounded" style={{ width: `${(m.netProfit/maxRev)*100}%` }} /></div><span className="text-xs text-green-600 w-20 text-right">{m.netMargin}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30"><tr>{["Month","Revenue","COGS","Gross %","Commissions","Net Profit","Net %","Orders"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {months.map(m => (
                  <tr key={m.month} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{m.month}</td>
                    <td className="px-4 py-3">PKR {(m.revenue/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3 text-red-600">PKR {(m.cogs/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3">{m.grossMargin}%</td>
                    <td className="px-4 py-3 text-orange-600">PKR {(m.commissions/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3 font-bold text-green-600">PKR {(m.netProfit/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3"><span className={`text-sm font-medium ${m.netMargin >= 20 ? "text-green-600" : m.netMargin >= 15 ? "text-blue-600" : "text-orange-600"}`}>{m.netMargin}%</span></td>
                    <td className="px-4 py-3">{m.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "category" && (
        <div className="space-y-3">
          {cats.map(cat => (
            <div key={cat.category} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{cat.category}</span>
                <div className="flex gap-4 text-sm">
                  <span>Revenue: <strong>PKR {(cat.revenue/1000).toFixed(0)}K</strong></span>
                  <span className="text-red-600">COGS: PKR {(cat.cogs/1000).toFixed(0)}K</span>
                  <span className="text-green-600 font-bold">Profit: PKR {(cat.profit/1000).toFixed(0)}K ({cat.margin}%)</span>
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-3 rounded-full flex">
                  <div className="bg-red-400" style={{ width: `${(cat.cogs/cat.revenue)*100}%` }} />
                  <div className="bg-green-500" style={{ width: `${(cat.profit/cat.revenue)*100}%` }} />
                </div>
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 bg-red-400 rounded-full" />COGS {Math.round((cat.cogs/cat.revenue)*100)}%</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 bg-green-500 rounded-full" />Profit {cat.margin}%</span>
                <span>{cat.orderCount} orders</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-2xl">
          {[
            { label: "Best Month", value: summary.bestMonth, icon: <TrendingUp className="h-5 w-5 text-green-500" />, bg: "bg-green-50 border-green-200" },
            { label: "Worst Month", value: summary.worstMonth, icon: <TrendingDown className="h-5 w-5 text-red-500" />, bg: "bg-red-50 border-red-200" },
            { label: "Avg Net Margin", value: `${summary.avgNetMargin}%`, icon: <DollarSign className="h-5 w-5 text-blue-500" />, bg: "bg-blue-50 border-blue-200" },
            { label: "Total Net Profit (6mo)", value: `PKR ${(summary.totalNetProfit/1000).toFixed(0)}K`, icon: <TrendingUp className="h-5 w-5 text-primary" />, bg: "bg-primary/5 border-primary/20" },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className={`border rounded-xl p-5 ${bg}`}>
              <div className="flex items-center gap-3 mb-1">{icon}<span className="text-sm text-muted-foreground">{label}</span></div>
              <div className="text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
