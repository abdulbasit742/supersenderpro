import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, TrendingDown, TrendingUp, Minus, RefreshCw, Bell, Zap } from "lucide-react";
import type { DealerAlert, DealerProduct } from "@/lib/dealer-monitor.functions";

export const Route = createFileRoute("/_app/dealer-monitor")({
  component: DealerMonitorPage,
});

type Tab = "alerts" | "products" | "analyze";

const MOCK_ALERTS: DealerAlert[] = [
  { id: "a1", dealerName: "Tech Resellers PK", product: "ChatGPT Plus", dealerPrice: 3800, ourPrice: 4200, margin: 10.5, trend: "stable", extractedAt: new Date(Date.now() - 3600000).toISOString(), source: "WA Group", rawText: "ChatGPT Plus fresh 3800 per month lagao" },
  { id: "a2", dealerName: "Digital Tools Hub", product: "Claude Pro", dealerPrice: 2900, ourPrice: 3500, margin: 17.1, trend: "down", extractedAt: new Date(Date.now() - 7200000).toISOString(), source: "WA Group", rawText: "Claude Pro 2900 available, stock limited!" },
  { id: "a3", dealerName: "AI Accounts PK", product: "Midjourney Basic", dealerPrice: 2600, ourPrice: 2800, margin: 7.1, trend: "up", extractedAt: new Date(Date.now() - 14400000).toISOString(), source: "WA Group", rawText: "MJ basic accounts 2600 only, buy in bulk" },
];

const MOCK_PRODUCTS: DealerProduct[] = [
  { id: "p1", name: "ChatGPT Plus", ourSellPrice: 4200, dealerBuyPrice: 3800, marketLowPrice: 3600, marginPercent: 10.5, alertOnDropBelow: 500, lastUpdated: new Date(Date.now() - 3600000).toISOString() },
  { id: "p2", name: "Claude Pro", ourSellPrice: 3500, dealerBuyPrice: 2900, marketLowPrice: 2700, marginPercent: 20.6, alertOnDropBelow: 400, lastUpdated: new Date(Date.now() - 7200000).toISOString() },
  { id: "p3", name: "Midjourney Basic", ourSellPrice: 2800, dealerBuyPrice: 2600, marketLowPrice: 2400, marginPercent: 7.7, alertOnDropBelow: 300, lastUpdated: new Date(Date.now() - 14400000).toISOString() },
  { id: "p4", name: "LinkedIn Premium", ourSellPrice: 5500, dealerBuyPrice: 4200, marketLowPrice: 4000, marginPercent: 30.9, alertOnDropBelow: 800, lastUpdated: new Date(Date.now() - 86400000).toISOString() },
];

const TREND_ICONS = { up: <TrendingUp className="h-4 w-4 text-red-500" />, down: <TrendingDown className="h-4 w-4 text-green-500" />, stable: <Minus className="h-4 w-4 text-gray-400" /> };
const TREND_LABELS = { up: "Price Rising", down: "Price Dropping", stable: "Stable" };

export default function DealerMonitorPage() {
  const [tab, setTab] = useState<Tab>("alerts");
  const [analyzeText, setAnalyzeText] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<{ product: string; price: number; confidence: number } | null>(null);
  const qc = useQueryClient();

  const { data: alerts = MOCK_ALERTS, isRefetching } = useQuery({
    queryKey: ["dealer-alerts"], queryFn: async () => { const { getDealerAlerts } = await import("@/lib/dealer-monitor.functions"); return getDealerAlerts(); }, placeholderData: MOCK_ALERTS, staleTime: 60_000,
  });
  const { data: products = MOCK_PRODUCTS } = useQuery({
    queryKey: ["dealer-products"], queryFn: async () => { const { getDealerProducts } = await import("@/lib/dealer-monitor.functions"); return getDealerProducts(); }, placeholderData: MOCK_PRODUCTS, staleTime: 120_000,
  });

  const analyzeMut = useMutation({
    mutationFn: async () => { const { extractPriceFromMessage } = await import("@/lib/dealer-monitor.functions"); return extractPriceFromMessage({ data: { message: analyzeText } }); },
    onSuccess: (r) => setAnalyzeResult(r),
  });

  const lowMarginCount = (alerts as typeof MOCK_ALERTS).filter(a => a.margin < 10).length;
  const avgMargin = alerts.length > 0 ? Math.round((alerts as typeof MOCK_ALERTS).reduce((s, a) => s + a.margin, 0) / alerts.length * 10) / 10 : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Eye className="h-6 w-6 text-primary" /> Dealer Price Monitor</h1>
        <p className="text-muted-foreground text-sm">AI extracts dealer prices from WhatsApp groups, tracks margins automatically</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{alerts.length}</div><div className="text-xs text-muted-foreground">Price Updates Today</div></div>
        <div className={`rounded-xl p-3 text-center ${lowMarginCount > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}><div className={`text-2xl font-bold ${lowMarginCount > 0 ? "text-red-700" : "text-green-700"}`}>{lowMarginCount}</div><div className={`text-xs ${lowMarginCount > 0 ? "text-red-600" : "text-green-600"}`}>Low Margin Alerts</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{avgMargin}%</div><div className="text-xs text-muted-foreground">Avg. Margin</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{products.length}</div><div className="text-xs text-muted-foreground">Products Tracked</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["alerts","products","analyze"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "alerts" ? "Recent Alerts" : t === "products" ? "Tracked Products" : "AI Analyze Message"}
          </button>
        ))}
      </div>

      {tab === "alerts" && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => qc.invalidateQueries({ queryKey: ["dealer-alerts"] })} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs hover:bg-accent"><RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh</button></div>
          {(alerts as typeof MOCK_ALERTS).map(alert => (
            <div key={alert.id} className={`bg-card border rounded-xl p-4 ${alert.margin < 10 ? "border-orange-300 bg-orange-50/30" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{alert.product}</span>
                    {TREND_ICONS[alert.trend as keyof typeof TREND_ICONS]}
                    <span className="text-xs text-muted-foreground">{TREND_LABELS[alert.trend as keyof typeof TREND_LABELS]}</span>
                    {alert.margin < 10 && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1"><Bell className="h-3 w-3" /> Low Margin</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">From: <strong>{alert.dealerName}</strong> via {alert.source}</p>
                  <div className="bg-muted/50 rounded px-2.5 py-1.5 text-xs font-mono italic text-muted-foreground mb-2">"{alert.rawText}"</div>
                  <div className="flex gap-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Dealer Cost</span><div className="font-bold text-red-600">PKR {alert.dealerPrice.toLocaleString()}</div></div>
                    <div><span className="text-muted-foreground text-xs">Our Sell Price</span><div className="font-bold">PKR {alert.ourPrice.toLocaleString()}</div></div>
                    <div><span className="text-muted-foreground text-xs">Margin</span><div className={`font-bold ${alert.margin < 10 ? "text-orange-600" : "text-green-600"}`}>{alert.margin}%</div></div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">{new Date(alert.extractedAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "products" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Product","Our Price","Dealer Cost","Market Low","Margin","Margin %","Updated"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(products as typeof MOCK_PRODUCTS).map(p => {
                const profit = p.ourSellPrice - p.dealerBuyPrice;
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-bold">PKR {p.ourSellPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-600">PKR {p.dealerBuyPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">PKR {p.marketLowPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">+PKR {profit.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`font-bold ${p.marginPercent < 10 ? "text-orange-600" : "text-green-600"}`}>{p.marginPercent}%</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.lastUpdated).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "analyze" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> AI Price Extractor</h3>
            <p className="text-sm text-muted-foreground">Paste a dealer group message — AI will extract product name, price, and confidence.</p>
            <textarea value={analyzeText} onChange={e => setAnalyzeText(e.target.value)} rows={5} placeholder="e.g. 'bhai ChatGPT plus 4 hazar mein deta hun, fresh account, guarantee ke saath'" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
            <button onClick={() => analyzeMut.mutate()} disabled={!analyzeText.trim() || analyzeMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{analyzeMut.isPending ? "AI Analyzing…" : "Extract Price with AI"}</button>
            {analyzeResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1">
                <div className="font-semibold text-green-800">Extracted Info</div>
                <div className="text-sm"><span className="text-muted-foreground">Product:</span> <span className="font-medium">{analyzeResult.product}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Price:</span> <span className="font-bold text-green-700">PKR {analyzeResult.price.toLocaleString()}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Confidence:</span> <span>{analyzeResult.confidence}%</span></div>
              </div>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Tip:</strong> Forward dealer group messages here or set up monitoring to automatically track prices across your WhatsApp groups.
          </div>
        </div>
      )}
    </div>
  );
}
