import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart2, TrendingUp, Target, DollarSign, Users, ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/_app/ads-tracker")({
  component: AdsTrackerPage,
});

type Tab = "campaigns" | "attribution" | "overview";

interface AdCampaign {
  id: string;
  name: string;
  platform: "meta" | "google" | "tiktok" | "manual";
  status: "active" | "paused" | "ended";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  waClicks: number;
  conversions: number;
  revenue: number;
  startDate: string;
  endDate?: string;
}

interface AttributionRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  customerName: string;
  whatsapp: string;
  source: string;
  conversationDate: string;
  orderValue: number;
  converted: boolean;
}

const MOCK_CAMPAIGNS: AdCampaign[] = [
  { id: "c1", name: "ChatGPT Plus Summer Deal", platform: "meta", status: "active", budget: 5000, spent: 3200, impressions: 45000, clicks: 890, waClicks: 234, conversions: 47, revenue: 197400, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "c2", name: "Digital Tools Bundle", platform: "meta", status: "active", budget: 3000, spent: 1800, impressions: 28000, clicks: 560, waClicks: 145, conversions: 28, revenue: 98000, startDate: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "c3", name: "LinkedIn Premium B2B", platform: "google", status: "paused", budget: 8000, spent: 8000, impressions: 12000, clicks: 340, waClicks: 89, conversions: 21, revenue: 115500, startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: new Date(Date.now() - 7 * 86400000).toISOString() },
];

const MOCK_ATTRIBUTION: AttributionRecord[] = [
  { id: "a1", campaignId: "c1", campaignName: "ChatGPT Plus Summer Deal", customerName: "Ahmed Khan", whatsapp: "03001234567", source: "meta_ad", conversationDate: new Date(Date.now() - 86400000).toISOString(), orderValue: 4200, converted: true },
  { id: "a2", campaignId: "c1", campaignName: "ChatGPT Plus Summer Deal", customerName: "Sara Ali", whatsapp: "03111234567", source: "meta_ad", conversationDate: new Date(Date.now() - 3600000).toISOString(), orderValue: 0, converted: false },
  { id: "a3", campaignId: "c2", campaignName: "Digital Tools Bundle", customerName: "Bilal Raza", whatsapp: "03211234567", source: "meta_ad", conversationDate: new Date(Date.now() - 7200000).toISOString(), orderValue: 7300, converted: true },
];

const PLATFORM_COLORS = { meta: "bg-blue-100 text-blue-700", google: "bg-red-100 text-red-700", tiktok: "bg-black/10 text-gray-700", manual: "bg-gray-100 text-gray-600" };
const STATUS_COLORS = { active: "bg-green-100 text-green-700", paused: "bg-yellow-100 text-yellow-700", ended: "bg-gray-100 text-gray-500" };

function MetricCard({ label, value, sub, icon, trend }: { label: string; value: string; sub?: string; icon: React.ReactNode; trend?: "up" | "down" }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2"><div className="text-muted-foreground">{icon}</div>{trend && <div className={`flex items-center gap-0.5 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>{trend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}</div>}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function AdsTrackerPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const { data: campaigns = MOCK_CAMPAIGNS } = useQuery({
    queryKey: ["ad-campaigns"], queryFn: async () => MOCK_CAMPAIGNS, placeholderData: MOCK_CAMPAIGNS, staleTime: 60_000,
  });
  const { data: attribution = MOCK_ATTRIBUTION } = useQuery({
    queryKey: ["ad-attribution"], queryFn: async () => MOCK_ATTRIBUTION, placeholderData: MOCK_ATTRIBUTION, staleTime: 60_000,
  });

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const totalWAClicks = campaigns.reduce((s, c) => s + c.waClicks, 0);
  const overallROAS = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : "0";
  const avgCPL = totalWAClicks > 0 ? Math.round(totalSpent / totalWAClicks) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart2 className="h-6 w-6 text-primary" /> WhatsApp Ads ROI Tracker</h1>
        <p className="text-muted-foreground text-sm">Track Meta/Google ad performance → WhatsApp conversations → revenue attribution</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Ad Spend" value={`PKR ${(totalSpent / 1000).toFixed(1)}K`} icon={<DollarSign className="h-4 w-4" />} />
        <MetricCard label="Revenue Generated" value={`PKR ${(totalRevenue / 1000).toFixed(0)}K`} icon={<TrendingUp className="h-4 w-4" />} trend="up" />
        <MetricCard label="Overall ROAS" value={`${overallROAS}x`} sub="Return on ad spend" icon={<Target className="h-4 w-4" />} trend="up" />
        <MetricCard label="Cost per WA Click" value={`PKR ${avgCPL}`} icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="flex gap-1 border-b">
        {(["overview","campaigns","attribution"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "overview" ? "Overview" : t === "campaigns" ? "Campaigns" : "Attribution"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: "WA Clicks from Ads", value: totalWAClicks, desc: "People who clicked to WhatsApp from ads" },
              { label: "Conversions", value: totalConversions, desc: "Orders placed after ad click" },
              { label: "Conversion Rate", value: `${totalWAClicks > 0 ? Math.round((totalConversions / totalWAClicks) * 100) : 0}%`, desc: "WA clicks → actual orders" },
            ].map(({ label, value, desc }) => (
              <div key={label} className="bg-card border rounded-xl p-4"><div className="text-2xl font-bold mb-1">{value}</div><div className="font-medium text-sm">{label}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Campaign Performance</h3>
            <div className="space-y-3">
              {campaigns.map(c => {
                const roas = c.spent > 0 ? (c.revenue / c.spent).toFixed(1) : "0";
                const ctrPct = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0";
                const convRate = c.waClicks > 0 ? Math.round((c.conversions / c.waClicks) * 100) : 0;
                return (
                  <div key={c.id} className="border rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2"><span className="font-medium">{c.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[c.platform]}`}>{c.platform}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span></div>
                      <span className="text-sm font-bold text-green-600">{roas}x ROAS</span>
                    </div>
                    <div className="grid grid-cols-6 gap-3 text-xs">
                      <div className="text-center"><div className="font-bold">{c.impressions.toLocaleString()}</div><div className="text-muted-foreground">Impressions</div></div>
                      <div className="text-center"><div className="font-bold">{c.clicks}</div><div className="text-muted-foreground">Clicks</div></div>
                      <div className="text-center"><div className="font-bold">{ctrPct}%</div><div className="text-muted-foreground">CTR</div></div>
                      <div className="text-center"><div className="font-bold text-[#25D366]">{c.waClicks}</div><div className="text-muted-foreground">WA Clicks</div></div>
                      <div className="text-center"><div className="font-bold">{c.conversions}</div><div className="text-muted-foreground">Orders</div></div>
                      <div className="text-center"><div className="font-bold">{convRate}%</div><div className="text-muted-foreground">Conv.</div></div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Spent: <strong>PKR {c.spent.toLocaleString()}</strong> / PKR {c.budget.toLocaleString()}</span>
                      <span>Revenue: <strong className="text-green-600">PKR {c.revenue.toLocaleString()}</strong></span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-1.5"><div className="h-1.5 bg-primary rounded-full" style={{ width: `${Math.min(100, Math.round((c.spent / c.budget) * 100))}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Campaign","Platform","Status","Budget","Spent","WA Clicks","Orders","Revenue","ROAS"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium max-w-40 truncate">{c.name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[c.platform]}`}>{c.platform}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3">PKR {c.budget.toLocaleString()}</td>
                  <td className="px-4 py-3">PKR {c.spent.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-[#25D366]">{c.waClicks}</td>
                  <td className="px-4 py-3">{c.conversions}</td>
                  <td className="px-4 py-3 font-bold text-green-600">PKR {c.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold">{c.spent > 0 ? (c.revenue / c.spent).toFixed(1) : "0"}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "attribution" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b"><p className="text-sm text-muted-foreground">Track which customers came from which ad campaign → WhatsApp conversation → order</p></div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Customer","Campaign","WhatsApp","Date","Order Value","Converted"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(attribution as typeof MOCK_ATTRIBUTION).map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.customerName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.campaignName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.whatsapp}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.conversationDate).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold">{r.converted ? `PKR ${r.orderValue.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.converted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{r.converted ? "Yes" : "No"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
