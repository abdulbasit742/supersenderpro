import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, Plus, Send, X } from "lucide-react";
import type { Bundle, BundleItem } from "@/lib/bundles.functions";

export const Route = createFileRoute("/_app/bundles")({
  component: BundlesPage,
});

type Tab = "bundles" | "create";

const MOCK_BUNDLES: Bundle[] = [
  { id: "bn1", name: "Creator Pack", description: "ChatGPT + Midjourney + Canva Pro", items: [{ productName: "ChatGPT Plus", quantity: 1, unitPrice: 3500 }, { productName: "Midjourney Pro", quantity: 1, unitPrice: 4200 }, { productName: "Canva Pro", quantity: 1, unitPrice: 1800 }], originalTotal: 9500, bundlePrice: 7500, savings: 2000, savingsPercent: 21, isActive: true, totalSold: 34, totalRevenue: 255000, createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "bn2", name: "Streaming Bundle", description: "Netflix + Spotify + YouTube Premium", items: [{ productName: "Netflix Premium", quantity: 1, unitPrice: 2500 }, { productName: "Spotify Family", quantity: 1, unitPrice: 1200 }, { productName: "YouTube Premium", quantity: 1, unitPrice: 900 }], originalTotal: 4600, bundlePrice: 3800, savings: 800, savingsPercent: 17, isActive: true, totalSold: 67, totalRevenue: 254600, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "bn3", name: "Business Starter", description: "LinkedIn + Grammarly + Adobe CC", items: [{ productName: "LinkedIn Premium", quantity: 1, unitPrice: 4500 }, { productName: "Grammarly Pro", quantity: 1, unitPrice: 1500 }, { productName: "Adobe CC", quantity: 1, unitPrice: 5500 }], originalTotal: 11500, bundlePrice: 9000, savings: 2500, savingsPercent: 22, isActive: false, totalSold: 12, totalRevenue: 108000, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

export default function BundlesPage() {
  const [tab, setTab] = useState<Tab>("bundles");
  const [items, setItems] = useState<BundleItem[]>([{ productName: "", quantity: 1, unitPrice: 0 }]);
  const [bundleName, setBundleName] = useState("");
  const [bundleDesc, setBundleDesc] = useState("");
  const [bundlePrice, setBundlePrice] = useState(0);
  const [blastId, setBlastId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: bundles = MOCK_BUNDLES } = useQuery({ queryKey: ["bundles"], queryFn: async () => { const { getBundles } = await import("@/lib/bundles.functions"); return getBundles(); }, placeholderData: MOCK_BUNDLES, staleTime: 60_000 });

  const toggleMut = useMutation({ mutationFn: async ({ bundleId, isActive }: { bundleId: string; isActive: boolean }) => { const { toggleBundle } = await import("@/lib/bundles.functions"); return toggleBundle({ data: { bundleId, isActive } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["bundles"] }) });
  const saveMut = useMutation({ mutationFn: async () => { const { saveBundle } = await import("@/lib/bundles.functions"); return saveBundle({ data: { name: bundleName, description: bundleDesc, items, bundlePrice, isActive: true } }); }, onSuccess: () => { setTab("bundles"); setBundleName(""); setItems([{ productName: "", quantity: 1, unitPrice: 0 }]); } });
  const blastMut = useMutation({ mutationFn: async (bundleId: string) => { const { promoteBundleViaWA } = await import("@/lib/bundles.functions"); return promoteBundleViaWA({ data: { bundleId, targetSegment: "all" } }); }, onSuccess: (_, id) => setBlastId(id) });

  const addItem = () => setItems(p => [...p, { productName: "", quantity: 1, unitPrice: 0 }]);
  const updateItem = (i: number, field: keyof BundleItem, val: string | number) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const originalTotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Bundle Builder</h1><p className="text-muted-foreground text-sm">Create product bundles with discounts — blast via WhatsApp to all customers</p></div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Create Bundle</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{bundles.filter(b => b.isActive).length}</div><div className="text-xs text-muted-foreground">Active Bundles</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">PKR {((bundles as typeof MOCK_BUNDLES).reduce((s,b) => s+b.totalRevenue, 0)/1000).toFixed(0)}K</div><div className="text-xs text-green-600">Bundle Revenue</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{(bundles as typeof MOCK_BUNDLES).reduce((s,b) => s+b.totalSold, 0)}</div><div className="text-xs text-muted-foreground">Bundles Sold</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["bundles","create"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "create" ? "Create Bundle" : "My Bundles"}</button>)}
      </div>

      {tab === "bundles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(bundles as typeof MOCK_BUNDLES).map(bundle => (
            <div key={bundle.id} className={`bg-card border-2 rounded-xl p-4 ${bundle.isActive ? "border-primary/30" : "border-border opacity-70"}`}>
              <div className="flex items-start justify-between mb-2"><div><div className="font-bold text-lg">{bundle.name}</div><div className="text-sm text-muted-foreground">{bundle.description}</div></div><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bundle.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{bundle.isActive ? "Active" : "Inactive"}</span></div>
              <div className="space-y-1 mb-3">{bundle.items.map((item, i) => <div key={i} className="flex justify-between text-sm"><span>{item.productName}</span><span className="text-muted-foreground">PKR {item.unitPrice.toLocaleString()}</span></div>)}</div>
              <div className="border-t pt-2 mb-3">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Original Total</span><span className="line-through">PKR {bundle.originalTotal.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Bundle Price</span><span className="text-primary">PKR {bundle.bundlePrice.toLocaleString()}</span></div>
                <div className="text-green-600 text-sm font-medium">Save PKR {bundle.savings.toLocaleString()} ({bundle.savingsPercent}% off)</div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2"><span>{bundle.totalSold} sold</span><span>Revenue: PKR {(bundle.totalRevenue/1000).toFixed(0)}K</span></div>
              <div className="flex gap-2">
                <button onClick={() => toggleMut.mutate({ bundleId: bundle.id, isActive: !bundle.isActive })} className="flex-1 py-1.5 border rounded text-xs hover:bg-accent">{bundle.isActive ? "Deactivate" : "Activate"}</button>
                <button onClick={() => blastMut.mutate(bundle.id)} disabled={!bundle.isActive || blastMut.isPending} className="flex items-center gap-1 px-3 py-1.5 bg-[#25D366] text-white rounded text-xs disabled:opacity-50"><Send className="h-3 w-3" />{blastId === bundle.id ? "Sent!" : "WA Blast"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-lg space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Create New Bundle</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Bundle Name</label><input value={bundleName} onChange={e => setBundleName(e.target.value)} placeholder="e.g., Creator Pack" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Description</label><input value={bundleDesc} onChange={e => setBundleDesc(e.target.value)} placeholder="Short selling pitch" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><label className="text-xs text-muted-foreground">Bundle Items</label><button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="h-3 w-3" />Add Item</button></div>
              {items.map((item, i) => <div key={i} className="flex gap-1"><input value={item.productName} onChange={e => updateItem(i, "productName", e.target.value)} placeholder="Product" className="flex-1 px-2 py-1.5 border rounded text-sm bg-background" /><input type="number" value={item.unitPrice || ""} onChange={e => updateItem(i, "unitPrice", +e.target.value)} placeholder="Price" className="w-24 px-2 py-1.5 border rounded text-sm bg-background" />{items.length > 1 && <button onClick={() => removeItem(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X className="h-4 w-4" /></button>}</div>)}
            </div>
            {originalTotal > 0 && <div className="bg-muted/30 rounded-lg p-2 text-sm"><div className="flex justify-between"><span>Original Total:</span><span>PKR {originalTotal.toLocaleString()}</span></div></div>}
            <div><label className="text-xs text-muted-foreground block mb-1">Bundle Price (discounted)</label><input type="number" value={bundlePrice || ""} onChange={e => setBundlePrice(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />{bundlePrice > 0 && originalTotal > 0 && <div className="text-green-600 text-xs mt-1">Saving: PKR {(originalTotal - bundlePrice).toLocaleString()} ({Math.round((originalTotal - bundlePrice) / originalTotal * 100)}% off)</div>}</div>
            <button onClick={() => saveMut.mutate()} disabled={!bundleName || items.some(i => !i.productName) || bundlePrice <= 0 || saveMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Creating…" : "Create Bundle"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
