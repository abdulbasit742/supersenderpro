import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn } from "@/components/ui-kit";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { stockInventoryData } from "@/lib/mock-reseller";

export const Route = createFileRoute("/_app/stock")({
  component: StockPage,
});

function StockPage() {
  const [rows, setRows] = useState(stockInventoryData);
  useEffect(() => {
    api.raw.get<any[]>("/api/business/stock-inventory").then((r) => { if (r?.length) setRows(r as any); });
  }, []);

  const total = rows.reduce((s, r) => s + Number(r.available || 0), 0);
  const low = rows.filter((r) => r.available > 0 && r.available <= r.threshold).length;
  const out = rows.filter((r) => r.available === 0).length;

  return (
    <>
      <PageHeader title="Stock" subtitle="Account inventory by tool, plan aur warranty type." actions={<Btn variant="primary">+ Add Stock</Btn>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><div className="text-xs text-muted-foreground">Total Accounts</div><div className="text-2xl font-semibold">{total}</div></Card>
        <Card><div className="text-xs text-muted-foreground">SKUs</div><div className="text-2xl font-semibold">{rows.length}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Low Stock</div><div className="text-2xl font-semibold text-warning">{low}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Out of Stock</div><div className="text-2xl font-semibold text-destructive">{out}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Tool", "Plan", "Account Type", "Available", "Total", "Stock Level", "Dealer", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const pct = Math.min(100, (r.available / Math.max(1, r.total)) * 100);
                const status = r.available === 0 ? "out" : r.available <= r.threshold ? "low" : "ok";
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 font-semibold capitalize">{r.tool}</td>
                    <td className="px-4 py-3 capitalize">{r.plan}</td>
                    <td className="px-4 py-3"><Badge variant="muted">{r.accountType}</Badge></td>
                    <td className="px-4 py-3 font-bold">{r.available}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.total}</td>
                    <td className="px-4 py-3 w-48">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${status === "ok" ? "bg-success" : status === "low" ? "bg-warning" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="info">{r.dealerCode}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={status === "ok" ? "success" : status === "low" ? "warning" : "destructive"}>{status === "ok" ? "Healthy" : status === "low" ? "Low" : "Out"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
