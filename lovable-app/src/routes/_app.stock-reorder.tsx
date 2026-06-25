import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, AlertTriangle, Send, Plus, Save, RefreshCw, TrendingDown } from "lucide-react";
import type { StockItem, ReorderLog } from "@/lib/stock-reorder.functions";

export const Route = createFileRoute("/_app/stock-reorder")({
  component: StockReorderPage,
});

type Tab = "stock" | "reorders" | "add";

const STATUS_COLORS = { in_stock: "bg-green-100 text-green-700", low_stock: "bg-orange-100 text-orange-700", out_of_stock: "bg-red-100 text-red-700", reordering: "bg-blue-100 text-blue-700" };
const STATUS_LABELS = { in_stock: "In Stock", low_stock: "Low Stock", out_of_stock: "Out of Stock", reordering: "Reordering" };

const MOCK_STOCK: StockItem[] = [
  { id: "s1", productName: "ChatGPT Plus", category: "AI Tools", currentStock: 5, minThreshold: 10, maxStock: 50, reorderQuantity: 30, supplierName: "Tech Resellers PK", supplierWhatsapp: "03001234567", unitCost: 3800, autoReorder: true, status: "low_stock" },
  { id: "s2", productName: "Claude Pro", category: "AI Tools", currentStock: 0, minThreshold: 5, maxStock: 30, reorderQuantity: 20, supplierName: "Digital Hub", supplierWhatsapp: "03111234567", unitCost: 2900, autoReorder: true, status: "out_of_stock" },
  { id: "s3", productName: "LinkedIn Premium", category: "Professional", currentStock: 25, minThreshold: 5, maxStock: 40, reorderQuantity: 20, supplierName: "ProTools PK", supplierWhatsapp: "03211234567", unitCost: 4200, autoReorder: false, status: "in_stock" },
  { id: "s4", productName: "Midjourney Basic", category: "Creative", currentStock: 12, minThreshold: 8, maxStock: 35, reorderQuantity: 20, supplierName: "Creative Accounts", supplierWhatsapp: "03321234567", unitCost: 2600, autoReorder: true, status: "in_stock" },
];

const MOCK_LOGS: ReorderLog[] = [
  { id: "rl1", productId: "s2", productName: "Claude Pro", quantity: 20, unitCost: 2900, totalCost: 58000, supplierName: "Digital Hub", method: "whatsapp", status: "sent", sentAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "rl2", productId: "s1", productName: "ChatGPT Plus", quantity: 30, unitCost: 3800, totalCost: 114000, supplierName: "Tech Resellers PK", method: "whatsapp", status: "confirmed", sentAt: new Date(Date.now() - 86400000).toISOString() },
];

const REORDER_STATUS_COLORS = { sent: "bg-blue-100 text-blue-700", confirmed: "bg-green-100 text-green-700", received: "bg-gray-100 text-gray-600", cancelled: "bg-red-100 text-red-700" };

export default function StockReorderPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [reorderQty, setReorderQty] = useState<Record<string, number>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<StockItem>>({ category: "AI Tools", minThreshold: 5, maxStock: 30, reorderQuantity: 20, autoReorder: true, unitCost: 0, currentStock: 0 });
  const qc = useQueryClient();

  const { data: stock = MOCK_STOCK } = useQuery({
    queryKey: ["stock"], queryFn: async () => { const { getStockItems } = await import("@/lib/stock-reorder.functions"); return getStockItems(); }, placeholderData: MOCK_STOCK, staleTime: 60_000,
  });
  const { data: logs = MOCK_LOGS } = useQuery({
    queryKey: ["reorder-logs"], queryFn: async () => { const { getReorderLogs } = await import("@/lib/stock-reorder.functions"); return getReorderLogs(); }, placeholderData: MOCK_LOGS, staleTime: 60_000,
  });

  const reorderMut = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty?: number }) => { const { triggerReorder } = await import("@/lib/stock-reorder.functions"); return triggerReorder({ data: { stockItemId: id, quantity: qty } }); },
    onSuccess: (r) => { setSuccessMsg(`Reorder sent for ${r.quantity}x ${r.product}! Total: PKR ${r.totalCost.toLocaleString()}${r.demo ? " (demo)" : ""}`); qc.invalidateQueries({ queryKey: ["reorder-logs"] }); setTimeout(() => setSuccessMsg(null), 5000); },
  });

  const saveMut = useMutation({
    mutationFn: async () => { const { saveStockItem } = await import("@/lib/stock-reorder.functions"); return saveStockItem({ data: newItem as Record<string, unknown> }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock"] }); setTab("stock"); },
  });

  const alertItems = (stock as typeof MOCK_STOCK).filter(s => s.status === "low_stock" || s.status === "out_of_stock");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Stock & Auto-Reorder</h1>
          <p className="text-muted-foreground text-sm">Monitor stock levels and send reorder messages to suppliers via WhatsApp</p>
        </div>
        <button onClick={() => setTab("add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Add Product</button>
      </div>

      {alertItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-orange-800 mb-1">{alertItems.length} product{alertItems.length > 1 ? "s" : ""} need restock!</div>
            <div className="flex flex-wrap gap-2">
              {alertItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 bg-orange-100 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-medium">{item.productName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>{item.currentStock} left</span>
                  <button onClick={() => reorderMut.mutate({ id: item.id })} disabled={reorderMut.isPending} className="text-xs bg-[#25D366] text-white px-2 py-1 rounded flex items-center gap-1"><Send className="h-3 w-3" />Reorder</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {successMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">{successMsg}</div>}

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{stock.length}</div><div className="text-xs text-muted-foreground">Total Products</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{stock.filter(s => s.status === "in_stock").length}</div><div className="text-xs text-green-600">In Stock</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-700">{stock.filter(s => s.status === "low_stock").length}</div><div className="text-xs text-orange-600">Low Stock</div></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-700">{stock.filter(s => s.status === "out_of_stock").length}</div><div className="text-xs text-red-600">Out of Stock</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["stock","reorders","add"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "stock" ? "Stock Levels" : t === "reorders" ? "Reorder History" : "Add Product"}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Product","Category","Stock","Threshold","Auto","Supplier","Unit Cost","Status","Action"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(stock as typeof MOCK_STOCK).map(s => (
                <tr key={s.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.productName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{s.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${s.currentStock === 0 ? "text-red-600" : s.currentStock < s.minThreshold ? "text-orange-600" : "text-green-600"}`}>{s.currentStock}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full"><div className={`h-1.5 rounded-full ${s.currentStock === 0 ? "bg-red-500" : s.currentStock < s.minThreshold ? "bg-orange-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, Math.round((s.currentStock / s.maxStock) * 100))}%` }} /></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.minThreshold}</td>
                  <td className="px-4 py-3">{s.autoReorder ? <span className="text-green-600 text-xs font-medium">Auto</span> : <span className="text-muted-foreground text-xs">Manual</span>}</td>
                  <td className="px-4 py-3 text-xs">{s.supplierName ?? "—"}</td>
                  <td className="px-4 py-3">PKR {s.unitCost.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={reorderQty[s.id] ?? s.reorderQuantity} onChange={e => setReorderQty(p => ({ ...p, [s.id]: Number(e.target.value) }))} className="w-14 px-1.5 py-1 border rounded text-xs bg-background" />
                      <button onClick={() => reorderMut.mutate({ id: s.id, qty: reorderQty[s.id] })} disabled={reorderMut.isPending} className="p-1.5 bg-[#25D366] text-white rounded hover:bg-green-600 disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reorders" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Product","Qty","Unit Cost","Total","Supplier","Method","Status","Date"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(logs as typeof MOCK_LOGS).map(log => (
                <tr key={log.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{log.productName}</td>
                  <td className="px-4 py-3">{log.quantity}</td>
                  <td className="px-4 py-3">PKR {log.unitCost.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold">PKR {log.totalCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.supplierName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs capitalize">{log.method}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REORDER_STATUS_COLORS[log.status]}`}>{log.status}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.sentAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "add" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">New Product</h3>
            {[["productName","Product Name","ChatGPT Plus"],["category","Category","AI Tools"],["supplierName","Supplier Name","Tech Resellers PK"],["supplierWhatsapp","Supplier WhatsApp","03001234567"]].map(([key, label, placeholder]) => (
              <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label><input value={(newItem as Record<string, string>)[key] ?? ""} onChange={e => setNewItem(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {[["currentStock","Current Stock"],["minThreshold","Min Threshold"],["maxStock","Max Stock"],["reorderQuantity","Reorder Qty"],["unitCost","Unit Cost (PKR)"]].map(([key, label]) => (
                <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label><input type="number" value={(newItem as Record<string, number>)[key] ?? 0} onChange={e => setNewItem(p => ({ ...p, [key]: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setNewItem(p => ({ ...p, autoReorder: !p.autoReorder }))} className={`relative h-6 w-11 rounded-full transition-colors ${newItem.autoReorder ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${newItem.autoReorder ? "translate-x-5" : "translate-x-0.5"}`} /></button>
              <span className="text-sm">Auto-reorder when below threshold</span>
            </div>
          </div>
          <button onClick={() => saveMut.mutate()} disabled={!newItem.productName || saveMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />{saveMut.isPending ? "Saving…" : "Add Product"}</button>
        </div>
      )}
    </div>
  );
}
