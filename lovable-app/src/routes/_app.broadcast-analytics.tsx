import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Radio, TrendingUp } from "lucide-react";
import type { BroadcastStat } from "@/lib/broadcast-analytics.functions";

export const Route = createFileRoute("/_app/broadcast-analytics")({
  component: BroadcastAnalyticsPage,
});

function makeStat(i: number): BroadcastStat {
  const names = ["Eid Mubarak Offer","Netflix Flash Deal","ChatGPT Renewal Reminder","Monthly Promo Blast","New Arrivals Alert","Weekend Special","VIP Customer Exclusive","Canva Pro Launch","Adobe CC Discount","Ramadan Bundle"];
  const total = [456,234,789,1200,567,345,123,678,456,890][i];
  const delivered = Math.round(total * 0.94);
  const read = Math.round(delivered * 0.72);
  const replied = Math.round(read * 0.22);
  const converted = Math.round(replied * 0.55);
  const d = new Date(); d.setDate(d.getDate() - i * 3);
  return { id: `bc${i+1}`, name: names[i], sentAt: d.toISOString(), segment: ["All","Netflix","ChatGPT","All","New","Weekend","VIP","Canva","Adobe","All"][i], total, delivered, read, replied, converted, failed: total-delivered, deliveryRate: Math.round(delivered/total*100), readRate: Math.round(read/delivered*100), replyRate: Math.round(replied/read*100), conversionRate: Math.round(converted/replied*100), revenue: converted*[3500,2500,3500,2800,1500,2200,4500,1800,5500,3800][i] };
}
const MOCK_STATS: BroadcastStat[] = Array.from({ length: 10 }, (_, i) => makeStat(i));

export default function BroadcastAnalyticsPage() {
  const [selected, setSelected] = useState<BroadcastStat>(MOCK_STATS[0]);

  const { data: stats = MOCK_STATS } = useQuery({ queryKey: ["broadcast-stats"], queryFn: async () => { const { getBroadcastStats } = await import("@/lib/broadcast-analytics.functions"); return getBroadcastStats(); }, placeholderData: MOCK_STATS, staleTime: 60_000 });

  const totalRevenue = (stats as typeof MOCK_STATS).reduce((s, b) => s + b.revenue, 0);
  const avgDelivery = Math.round((stats as typeof MOCK_STATS).reduce((s, b) => s + b.deliveryRate, 0) / stats.length);
  const avgConversion = Math.round((stats as typeof MOCK_STATS).reduce((s, b) => s + b.conversionRate, 0) / stats.length);

  const FunnelBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-right text-muted-foreground shrink-0">{label}</div>
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round(value / total * 100)}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">{value.toLocaleString()} ({Math.round(value/total*100)}%)</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Radio className="h-6 w-6 text-primary" /> Broadcast Analytics</h1><p className="text-muted-foreground text-sm">Per-campaign: delivered → read → replied → converted — see which blasts drive revenue</p></div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-lg font-bold text-green-700">PKR {(totalRevenue/1000000).toFixed(1)}M</div><div className="text-xs text-green-600">Total Revenue Generated</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{avgDelivery}%</div><div className="text-xs text-muted-foreground">Avg Delivery Rate</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{avgConversion}%</div><div className="text-xs text-muted-foreground">Avg Conversion Rate</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{stats.length}</div><div className="text-xs text-muted-foreground">Total Broadcasts</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">Select Broadcast</h3>
          {(stats as typeof MOCK_STATS).map(s => (
            <button key={s.id} onClick={() => setSelected(s)} className={`w-full text-left bg-card border rounded-xl p-3 transition-colors ${selected.id === s.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
              <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm truncate">{s.name}</span><span className="text-xs text-green-600 font-medium shrink-0">PKR {(s.revenue/1000).toFixed(0)}K</span></div>
              <div className="text-xs text-muted-foreground">{new Date(s.sentAt).toLocaleDateString()} · {s.total.toLocaleString()} sent</div>
              <div className="flex gap-2 mt-1 text-xs"><span className="text-blue-600">{s.deliveryRate}% del</span><span className="text-purple-600">{s.readRate}% read</span><span className="text-green-600">{s.conversionRate}% conv</span></div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-1">{selected.name}</h3>
            <div className="text-xs text-muted-foreground mb-4">{new Date(selected.sentAt).toLocaleString()} · Segment: {selected.segment}</div>
            <div className="space-y-2">
              <FunnelBar label="Sent" value={selected.total} total={selected.total} color="bg-gray-300" />
              <FunnelBar label="Delivered" value={selected.delivered} total={selected.total} color="bg-blue-400" />
              <FunnelBar label="Read" value={selected.read} total={selected.total} color="bg-indigo-400" />
              <FunnelBar label="Replied" value={selected.replied} total={selected.total} color="bg-purple-400" />
              <FunnelBar label="Converted" value={selected.converted} total={selected.total} color="bg-green-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-700">{selected.failed}</div><div className="text-xs text-red-600">Failed Deliveries</div></div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">PKR {selected.revenue.toLocaleString()}</div><div className="text-xs text-green-600">Revenue Generated</div></div>
            <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{selected.replyRate}%</div><div className="text-xs text-muted-foreground">Reply Rate</div></div>
            <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{selected.conversionRate}%</div><div className="text-xs text-muted-foreground">Conversion Rate</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
