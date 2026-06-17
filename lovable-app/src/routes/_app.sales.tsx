import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, KpiCard } from "@/components/ui-kit";
import { DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { salesData } from "@/lib/mock-reseller";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
});

function SalesPage() {
  const [rows, setRows] = useState(salesData);
  useEffect(() => {
    api.raw.get<any[]>("/api/business/sales?limit=100").then((r) => { if (r?.length) setRows(r as any); });
  }, []);

  const totalRev = rows.reduce((s, r) => s + r.sellPrice * r.qty, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  return (
    <>
      <PageHeader title="Sales" subtitle="Recent sales, channel breakdown aur profit log." actions={<Btn variant="primary">Export CSV</Btn>} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Total Revenue" value={`Rs ${totalRev.toLocaleString()}`} icon={DollarSign} accent="success" />
        <KpiCard label="Total Profit" value={`Rs ${totalProfit.toLocaleString()}`} icon={TrendingUp} accent="success" />
        <KpiCard label="Units Sold" value={totalQty} icon={ShoppingCart} accent="info" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Date", "Customer", "Tool", "Qty", "Sell", "Cost", "Profit", "Channel"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{s.date}</td>
                  <td className="px-4 py-3 font-medium">{s.customer}</td>
                  <td className="px-4 py-3">{s.tool}</td>
                  <td className="px-4 py-3">{s.qty}</td>
                  <td className="px-4 py-3">Rs {s.sellPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">Rs {s.cost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-success font-semibold">Rs {s.profit.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant="info">{s.channel}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
