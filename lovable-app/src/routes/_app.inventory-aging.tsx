import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, AlertTriangle, Clock, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_app/inventory-aging")({
  component: InventoryAgingPage,
});

interface AgingItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  costPerUnit: number;
  totalValue: number;
  daysInStock: number;
  agingBucket: "0-30" | "31-60" | "61-90" | "90+";
  lastSoldDays: number;
  suggestedAction: string;
}

const MOCK_ITEMS: AgingItem[] = [
  { id: "i1", sku: "CGP-001", productName: "ChatGPT Plus 1 Month", category: "AI Tools", quantity: 45, costPerUnit: 600, totalValue: 27000, daysInStock: 15, agingBucket: "0-30", lastSoldDays: 1, suggestedAction: "Active — keep stock" },
  { id: "i2", sku: "MJ-002", productName: "Midjourney Pro", category: "AI Tools", quantity: 23, costPerUnit: 1200, totalValue: 27600, daysInStock: 38, agingBucket: "31-60", lastSoldDays: 3, suggestedAction: "Selling well — reorder soon" },
  { id: "i3", sku: "NF-003", productName: "Netflix Premium 3 Months", category: "Streaming", quantity: 67, costPerUnit: 800, totalValue: 53600, daysInStock: 72, agingBucket: "61-90", lastSoldDays: 12, suggestedAction: "Slow movement — run promotion" },
  { id: "i4", sku: "AD-004", productName: "Adobe Creative Cloud", category: "Design", quantity: 12, costPerUnit: 4500, totalValue: 54000, daysInStock: 95, agingBucket: "90+", lastSoldDays: 30, suggestedAction: "Dead stock — discount or bundle" },
  { id: "i5", sku: "SP-005", productName: "Spotify Family 1 Year", category: "Music", quantity: 34, costPerUnit: 500, totalValue: 17000, daysInStock: 22, agingBucket: "0-30", lastSoldDays: 2, suggestedAction: "Active — keep stock" },
  { id: "i6", sku: "CV-006", productName: "Canva Pro Annual", category: "Design", quantity: 8, costPerUnit: 1800, totalValue: 14400, daysInStock: 105, agingBucket: "90+", lastSoldDays: 45, suggestedAction: "Dead stock — clearance sale" },
  { id: "i7", sku: "LN-007", productName: "LinkedIn Premium", category: "Professional", quantity: 19, costPerUnit: 2200, totalValue: 41800, daysInStock: 55, agingBucket: "31-60", lastSoldDays: 7, suggestedAction: "Moderate — monitor closely" },
];

const BUCKET_COLORS = { "0-30": "bg-green-100 text-green-700", "31-60": "bg-yellow-100 text-yellow-700", "61-90": "bg-orange-100 text-orange-700", "90+": "bg-red-100 text-red-700" };
const BUCKET_BG = { "0-30": "bg-green-500", "31-60": "bg-yellow-400", "61-90": "bg-orange-400", "90+": "bg-red-500" };

export default function InventoryAgingPage() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"daysInStock"|"totalValue"|"quantity">("daysInStock");

  const filtered = MOCK_ITEMS.filter(i => filter === "all" || i.agingBucket === filter).sort((a, b) => b[sort] - a[sort]);
  const totalValue = MOCK_ITEMS.reduce((s, i) => s + i.totalValue, 0);
  const deadStock = MOCK_ITEMS.filter(i => i.agingBucket === "90+").reduce((s, i) => s + i.totalValue, 0);

  const bucketData = (["0-30","31-60","61-90","90+"] as const).map(b => ({
    bucket: b,
    count: MOCK_ITEMS.filter(i => i.agingBucket === b).length,
    value: MOCK_ITEMS.filter(i => i.agingBucket === b).reduce((s, i) => s + i.totalValue, 0),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Inventory Aging Report</h1>
        <p className="text-muted-foreground text-sm">Identify slow-moving stock before it ties up cash flow</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">PKR {(totalValue/1000).toFixed(0)}K</div><div className="text-xs text-muted-foreground">Total Inventory Value</div></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-red-700">PKR {(deadStock/1000).toFixed(0)}K</div><div className="text-xs text-red-600">Dead Stock (90+ days)</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-orange-700">{MOCK_ITEMS.filter(i=>i.agingBucket!=="0-30").length}</div><div className="text-xs text-orange-600">Slow-moving SKUs</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">{Math.round(MOCK_ITEMS.reduce((s,i)=>s+i.daysInStock,0)/MOCK_ITEMS.length)}</div><div className="text-xs text-muted-foreground">Avg Days In Stock</div></div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {bucketData.map(b => (
          <div key={b.bucket} className="bg-card border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUCKET_COLORS[b.bucket]}`}>{b.bucket} days</span><span className="text-xs text-muted-foreground">{b.count} SKUs</span></div>
            <div className="text-lg font-bold">PKR {(b.value/1000).toFixed(0)}K</div>
            <div className="h-1.5 bg-muted rounded-full mt-2"><div className={`h-1.5 rounded-full ${BUCKET_BG[b.bucket]}`} style={{ width: `${Math.min(100, (b.value / totalValue) * 100)}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all","0-30","31-60","61-90","90+"].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{f === "all" ? "All" : `${f} days`}</button>)}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="px-3 py-1.5 border rounded-lg text-sm bg-background">
          <option value="daysInStock">Sort: Days in Stock</option>
          <option value="totalValue">Sort: Total Value</option>
          <option value="quantity">Sort: Quantity</option>
        </select>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30"><tr>{["SKU","Product","Category","Qty","Value","Days","Aging","Last Sold","Suggested Action"].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className={`border-b hover:bg-muted/20 ${item.agingBucket === "90+" ? "bg-red-50/30" : ""}`}>
                <td className="px-3 py-3 font-mono text-xs">{item.sku}</td>
                <td className="px-3 py-3 font-medium">{item.productName}</td>
                <td className="px-3 py-3 text-muted-foreground text-xs">{item.category}</td>
                <td className="px-3 py-3 text-center font-medium">{item.quantity}</td>
                <td className="px-3 py-3 font-medium">PKR {item.totalValue.toLocaleString()}</td>
                <td className="px-3 py-3 font-medium">{item.daysInStock}</td>
                <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUCKET_COLORS[item.agingBucket]}`}>{item.agingBucket}</span></td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{item.lastSoldDays === 1 ? "Yesterday" : item.lastSoldDays === 0 ? "Today" : `${item.lastSoldDays}d ago`}</td>
                <td className="px-3 py-3 text-xs">{item.agingBucket === "90+" ? <span className="text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{item.suggestedAction}</span> : item.suggestedAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
