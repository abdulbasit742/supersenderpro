import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, TrendingDown, Package, Calendar, DollarSign, BarChart3 } from "lucide-react";
import type { ForecastSummary } from "@/lib/forecast.functions";

export const Route = createFileRoute("/_app/forecast")({
  component: ForecastPage,
});

type Tab = "revenue" | "products" | "cashflow" | "inventory";

const MOCK_FORECAST: ForecastSummary = {
  next7Days: 45000,
  next30Days: 180000,
  next90Days: 520000,
  renewalPipeline: 95000,
  activeLeads: 14,
  confidenceLevel: 78,
  topProducts: [
    { productName: "ChatGPT Plus", currentSales: 75000, predictedNextMonth: 82000, trend: "up", trendPercent: 9 },
    { productName: "Claude Pro", currentSales: 45000, predictedNextMonth: 51000, trend: "up", trendPercent: 13 },
    { productName: "LinkedIn Premium", currentSales: 32000, predictedNextMonth: 28000, trend: "down", trendPercent: 12 },
    { productName: "Midjourney", currentSales: 18000, predictedNextMonth: 19000, trend: "stable", trendPercent: 5 },
    { productName: "SSD 256GB", currentSales: 12000, predictedNextMonth: 15000, trend: "up", trendPercent: 25 },
  ],
  dailyBreakdown: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() + (i + 1) * 86400000).toISOString().substring(0, 10),
    predictedRevenue: 5000 + Math.random() * 4000 + i * 50,
    confidence: Math.max(40, 95 - i * 1.5),
  })),
};

function BarMini({ value, max, color }: { value: number; max: number; color: string }) {
  return <div className="h-2 bg-muted rounded-full"><div className={`h-2 ${color} rounded-full`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}

export default function ForecastPage() {
  const [tab, setTab] = useState<Tab>("revenue");
  const [horizon, setHorizon] = useState(30);

  const { data: forecast = MOCK_FORECAST } = useQuery({
    queryKey: ["revenue-forecast", horizon],
    queryFn: async () => { const { getRevenueForecast } = await import("@/lib/forecast.functions"); return getRevenueForecast({ data: { days: horizon } }); },
    placeholderData: MOCK_FORECAST,
    staleTime: 300_000,
  });

  const { data: cashFlow = [] } = useQuery({
    queryKey: ["cash-flow", horizon],
    queryFn: async () => { const { getCashFlow } = await import("@/lib/forecast.functions"); return getCashFlow({ data: { days: horizon } }); },
    placeholderData: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() + i * 86400000).toISOString().substring(0, 10), inflow: 6000 + Math.random() * 3000, outflow: 2000 + Math.random() * 1000, balance: 50000 + i * 2000 })),
    staleTime: 300_000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory-forecast"],
    queryFn: async () => { const { getInventoryForecast } = await import("@/lib/forecast.functions"); return getInventoryForecast(); },
    placeholderData: [
      { product: "ChatGPT Plus Monthly", stockLeft: 45, dailySales: 3.2, daysRemaining: 14, reorderSoon: true },
      { product: "Claude Pro Monthly", stockLeft: 120, dailySales: 1.8, daysRemaining: 67, reorderSoon: false },
      { product: "LinkedIn Premium", stockLeft: 8, dailySales: 1.1, daysRemaining: 7, reorderSoon: true },
      { product: "SSD 256GB", stockLeft: 250, dailySales: 0.5, daysRemaining: 500, reorderSoon: false },
    ],
    staleTime: 300_000,
  });

  const maxDaily = Math.max(...(forecast.dailyBreakdown?.map((d) => d.predictedRevenue) ?? [1]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Revenue Forecasting</h1>
          <p className="text-muted-foreground text-sm">AI-powered predictions based on your sales history</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[7,30,90].map((d) => (
            <button key={d} onClick={() => setHorizon(d)} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${horizon === d ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Next 7 Days", value: `PKR ${(forecast.next7Days / 1000).toFixed(0)}K`, icon: Calendar, color: "bg-blue-100 text-blue-700" },
          { label: "Next 30 Days", value: `PKR ${(forecast.next30Days / 1000).toFixed(0)}K`, icon: TrendingUp, color: "bg-green-100 text-green-700" },
          { label: "Next 90 Days", value: `PKR ${(forecast.next90Days / 1000).toFixed(0)}K`, icon: TrendingUp, color: "bg-emerald-100 text-emerald-700" },
          { label: "Renewal Pipeline", value: `PKR ${(forecast.renewalPipeline / 1000).toFixed(0)}K`, icon: DollarSign, color: "bg-purple-100 text-purple-700" },
          { label: "AI Confidence", value: `${forecast.confidenceLevel}%`, icon: BarChart3, color: "bg-yellow-100 text-yellow-700" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4 flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg grid place-items-center ${color}`}><Icon className="h-5 w-5" /></div>
            <div><div className="text-xl font-bold">{value}</div><div className="text-sm font-medium text-muted-foreground">{label}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["revenue","products","cashflow","inventory"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "cashflow" ? "Cash Flow" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "revenue" && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-4">Daily Revenue Forecast — Next {horizon} Days</h3>
          <div className="space-y-1.5">
            {(forecast.dailyBreakdown ?? []).slice(0, horizon).map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <div className="flex-1"><BarMini value={day.predictedRevenue} max={maxDaily} color="bg-primary" /></div>
                <span className="text-xs font-mono w-20 text-right">PKR {Math.round(day.predictedRevenue).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(day.confidence)}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Confidence % decreases over time — predictions are most reliable for the next 7 days.</p>
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-3">
          <h3 className="font-semibold">Top Product Forecasts</h3>
          {(forecast.topProducts ?? []).map((p) => (
            <div key={p.productName} className="bg-card border rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{p.productName}</div>
                <div className="text-sm text-muted-foreground">This month: PKR {p.currentSales.toLocaleString()}</div>
                <div className="mt-2"><BarMini value={p.currentSales} max={Math.max(...(forecast.topProducts?.map((x) => x.currentSales) ?? [1]))} color="bg-blue-400" /></div>
              </div>
              <div className="text-right">
                <div className="font-bold">PKR {p.predictedNextMonth.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mb-1">next month</div>
                <div className={`flex items-center gap-1 justify-end text-sm font-medium ${p.trend === "up" ? "text-green-600" : p.trend === "down" ? "text-red-600" : "text-muted-foreground"}`}>
                  {p.trend === "up" ? <TrendingUp className="h-3 w-3" /> : p.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <span>—</span>}
                  {p.trendPercent}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "cashflow" && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-4">Projected Cash Flow</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b"><tr className="text-left">{["Date","Inflow","Outflow","Net","Balance"].map((h) => <th key={h} className="pb-2 pr-4 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {(cashFlow as Array<{ date: string; inflow: number; outflow: number; balance: number }>).slice(-horizon).map((row) => (
                  <tr key={row.date} className="border-b hover:bg-muted/20">
                    <td className="py-2 pr-4 text-muted-foreground">{new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="py-2 pr-4 text-green-600 font-mono">+{Math.round(row.inflow).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-red-600 font-mono">-{Math.round(row.outflow).toLocaleString()}</td>
                    <td className={`py-2 pr-4 font-mono ${row.inflow - row.outflow >= 0 ? "text-green-600" : "text-red-600"}`}>{row.inflow - row.outflow >= 0 ? "+" : ""}{Math.round(row.inflow - row.outflow).toLocaleString()}</td>
                    <td className="py-2 font-mono font-medium">{Math.round(row.balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "inventory" && (
        <div className="space-y-3">
          {(inventory as Array<{ product: string; stockLeft: number; dailySales: number; daysRemaining: number; reorderSoon: boolean }>).map((item) => (
            <div key={item.product} className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${item.reorderSoon ? "border-orange-300 bg-orange-50/30" : ""}`}>
              <Package className={`h-8 w-8 shrink-0 ${item.reorderSoon ? "text-orange-500" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <div className="font-medium">{item.product}</div>
                <div className="text-sm text-muted-foreground">{item.stockLeft} units left · {item.dailySales}/day avg</div>
                <div className="mt-1.5 h-2 bg-muted rounded-full"><div className={`h-2 rounded-full ${item.daysRemaining < 14 ? "bg-red-500" : item.daysRemaining < 30 ? "bg-orange-400" : "bg-green-500"}`} style={{ width: `${Math.min(100, (item.daysRemaining / 60) * 100)}%` }} /></div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${item.daysRemaining < 14 ? "text-red-600" : item.daysRemaining < 30 ? "text-orange-600" : "text-green-600"}`}>{item.daysRemaining > 500 ? "∞" : item.daysRemaining}d</div>
                <div className="text-xs text-muted-foreground">remaining</div>
                {item.reorderSoon && <div className="text-xs font-medium text-orange-600 mt-1">⚠ Reorder Soon</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
