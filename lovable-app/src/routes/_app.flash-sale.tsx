import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Zap, Plus, Send, X, Clock, TrendingUp, CheckCircle } from "lucide-react";
import type { FlashSale } from "@/lib/flash-sale.functions";

export const Route = createFileRoute("/_app/flash-sale")({
  component: FlashSalePage,
});

type Tab = "active" | "create" | "history";

const MOCK_SALES: FlashSale[] = [
  { id: "fs1", title: "Eid Special — ChatGPT Flash", description: "Sirf 4 ghantay ke liye ChatGPT Plus at lowest price!", discountType: "percent", discountValue: 30, originalPrice: 3500, salePrice: 2450, productName: "ChatGPT Plus 1 Month", startAt: new Date(Date.now() - 3600000).toISOString(), endAt: new Date(Date.now() + 3 * 3600000).toISOString(), status: "active", blastSent: true, blastSentAt: new Date(Date.now() - 3600000).toISOString(), targetSegment: "All Customers", totalRecipients: 1243, totalClaims: 87, totalRevenue: 213150, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "fs2", title: "Midnight Deal — Netflix", description: "Midnight flash sale!", discountType: "fixed", discountValue: 500, originalPrice: 2500, salePrice: 2000, productName: "Netflix Premium 1 Month", startAt: new Date(Date.now() + 2 * 3600000).toISOString(), endAt: new Date(Date.now() + 6 * 3600000).toISOString(), status: "scheduled", blastSent: false, targetSegment: "VIP Customers", totalRecipients: 234, totalClaims: 0, totalRevenue: 0, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "fs3", title: "Weekend Sale — Canva Pro", description: "Weekend special!", discountType: "percent", discountValue: 20, originalPrice: 1800, salePrice: 1440, productName: "Canva Pro Annual", startAt: new Date(Date.now() - 2 * 86400000).toISOString(), endAt: new Date(Date.now() - 86400000).toISOString(), status: "ended", blastSent: true, targetSegment: "All Customers", totalRecipients: 1243, totalClaims: 156, totalRevenue: 224640, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
];

const PRODUCTS = ["ChatGPT Plus","Midjourney Pro","Netflix Premium","Canva Pro","Adobe CC","Spotify Family","LinkedIn Premium","Grammarly Pro"];
const SEGMENTS = ["All Customers","VIP Customers","At-Risk","New Customers","Inactive (30d+)"];
const STATUS_COLORS = { active: "bg-green-100 text-green-700", scheduled: "bg-blue-100 text-blue-700", ended: "bg-gray-100 text-gray-500", cancelled: "bg-red-100 text-red-700" };

function Countdown({ endAt }: { endAt: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endAt]);
  return <span className="font-mono font-bold text-red-600">{remaining}</span>;
}

export default function FlashSalePage() {
  const [tab, setTab] = useState<Tab>("active");
  const [form, setForm] = useState({ title: "", description: "", productName: PRODUCTS[0], discountType: "percent" as const, discountValue: 20, originalPrice: 3500, startAt: "", endAt: "", targetSegment: SEGMENTS[0] });
  const [blastResult, setBlastResult] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: sales = MOCK_SALES } = useQuery({ queryKey: ["flash-sales"], queryFn: async () => { const { getFlashSales } = await import("@/lib/flash-sale.functions"); return getFlashSales(); }, placeholderData: MOCK_SALES, staleTime: 15_000 });

  const blastMut = useMutation({ mutationFn: async (id: string) => { const { blastFlashSale } = await import("@/lib/flash-sale.functions"); return blastFlashSale({ data: { saleId: id } }); }, onSuccess: (r, id) => { setBlastResult(p => ({ ...p, [id]: `Sent to ${(r as { messagesSent?: number }).messagesSent ?? 0} customers!` })); } });
  const saveMut = useMutation({ mutationFn: async () => { const salePrice = form.discountType === "percent" ? Math.round(form.originalPrice * (1 - form.discountValue / 100)) : form.originalPrice - form.discountValue; const { saveFlashSale } = await import("@/lib/flash-sale.functions"); return saveFlashSale({ data: { ...form, salePrice } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["flash-sales"] }); setTab("active"); } });

  const activeSales = sales.filter(s => s.status === "active");
  const scheduledSales = sales.filter(s => s.status === "scheduled");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-yellow-500" /> Flash Sale Manager</h1>
          <p className="text-muted-foreground text-sm">Create time-limited offers + auto-blast to customer segments via WhatsApp</p>
        </div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"><Plus className="h-4 w-4" />Create Flash Sale</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-yellow-700">{activeSales.length}</div><div className="text-xs text-yellow-600">Active Sales</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">{scheduledSales.length}</div><div className="text-xs text-blue-600">Scheduled</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{(sales as typeof MOCK_SALES).reduce((s,f)=>s+f.totalClaims,0)}</div><div className="text-xs text-green-600">Total Claims</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">PKR {((sales as typeof MOCK_SALES).reduce((s,f)=>s+f.totalRevenue,0)/1000).toFixed(0)}K</div><div className="text-xs text-muted-foreground">Flash Revenue</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["active","create","history"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-yellow-500 text-yellow-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "active" ? "Live & Scheduled" : t === "create" ? "Create Sale" : "History"}</button>)}
      </div>

      {tab === "active" && (
        <div className="space-y-4">
          {activeSales.map(s => (
            <div key={s.id} className="bg-card border-2 border-yellow-300 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div><div className="flex items-center gap-2 mb-1"><span className="font-bold text-lg">{s.title}</span><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">LIVE</span></div><div className="text-sm text-muted-foreground">{s.productName} · {s.discountType === "percent" ? `${s.discountValue}% OFF` : `PKR ${s.discountValue} OFF`}</div></div>
                <div className="text-right shrink-0"><div className="text-xs text-muted-foreground mb-0.5">Ends in</div><Countdown endAt={s.endAt} /></div>
              </div>
              <div className="flex items-center gap-4 text-sm mb-3">
                <div><span className="text-muted-foreground text-xs">Price</span><div><span className="line-through text-muted-foreground text-xs">PKR {s.originalPrice}</span> <span className="font-bold text-green-600">PKR {s.salePrice}</span></div></div>
                <div><span className="text-muted-foreground text-xs">Target</span><div className="font-medium text-xs">{s.targetSegment} ({s.totalRecipients})</div></div>
                <div><span className="text-muted-foreground text-xs">Claims</span><div className="font-bold text-primary">{s.totalClaims}</div></div>
                <div><span className="text-muted-foreground text-xs">Revenue</span><div className="font-bold text-green-600">PKR {s.totalRevenue.toLocaleString()}</div></div>
              </div>
              {!s.blastSent ? <button onClick={() => blastMut.mutate(s.id)} disabled={blastMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium"><Send className="h-4 w-4" />Send WhatsApp Blast</button> : <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="h-4 w-4" />Blast sent {s.blastSentAt ? new Date(s.blastSentAt).toLocaleTimeString() : ""}</div>}
              {blastResult[s.id] && <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1">{blastResult[s.id]}</div>}
            </div>
          ))}
          {scheduledSales.map(s => (
            <div key={s.id} className="bg-card border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className="flex items-center gap-2 mb-1"><span className="font-semibold">{s.title}</span><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">SCHEDULED</span></div><div className="text-sm text-muted-foreground">{s.productName} · Starts {new Date(s.startAt).toLocaleString()}</div></div>
                <div className="text-right"><div className="text-xs text-muted-foreground">Starts in</div><Countdown endAt={s.startAt} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-lg space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">New Flash Sale</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Sale Title</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Eid Special — ChatGPT Flash!" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Product</label><select value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{PRODUCTS.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground block mb-1">Original Price</label><input type="number" value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Discount</label><div className="flex gap-1"><select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as "percent"|"fixed" }))} className="w-20 px-2 py-2 border rounded-lg text-xs bg-background"><option value="percent">%</option><option value="fixed">PKR</option></select><input type="number" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: Number(e.target.value) }))} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background" /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground block mb-1">Start Time</label><input type="datetime-local" value={form.startAt} onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))} className="w-full px-2 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">End Time</label><input type="datetime-local" value={form.endAt} onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))} className="w-full px-2 py-2 border rounded-lg text-sm bg-background" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">Target Segment</label><select value={form.targetSegment} onChange={e => setForm(p => ({ ...p, targetSegment: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{SEGMENTS.map(s => <option key={s}>{s}</option>)}</select></div>
            {form.originalPrice > 0 && form.discountValue > 0 && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-sm">Sale Price: <strong className="text-green-600">PKR {form.discountType === "percent" ? Math.round(form.originalPrice * (1 - form.discountValue / 100)) : form.originalPrice - form.discountValue}</strong></div>}
            <button onClick={() => saveMut.mutate()} disabled={!form.title || !form.productName || saveMut.isPending} className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Creating…" : "Create Flash Sale"}</button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Title","Product","Discount","Status","Recipients","Claims","Revenue"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {sales.filter(s => s.status === "ended" || s.status === "cancelled").map(s => (
                <tr key={s.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.title}</td>
                  <td className="px-4 py-3 text-xs">{s.productName}</td>
                  <td className="px-4 py-3">{s.discountType === "percent" ? `${s.discountValue}%` : `PKR ${s.discountValue}`} OFF</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
                  <td className="px-4 py-3">{s.totalRecipients.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{s.totalClaims}</td>
                  <td className="px-4 py-3 font-medium text-green-600">PKR {s.totalRevenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
