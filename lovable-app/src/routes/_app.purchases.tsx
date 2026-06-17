import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, KpiCard } from "@/components/ui-kit";
import { ShoppingBag, DollarSign, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { purchasesData } from "@/lib/mock-reseller";

export const Route = createFileRoute("/_app/purchases")({
  component: PurchasesPage,
});

function PurchasesPage() {
  const [rows, setRows] = useState(purchasesData);
  useEffect(() => {
    api.raw.get<any[]>("/api/business/purchases?limit=100").then((r) => { if (r?.length) setRows(r as any); });
  }, []);
  const total = rows.reduce((s, r) => s + r.total, 0);
  const qty = rows.reduce((s, r) => s + r.qty, 0);
  return (
    <>
      <PageHeader title="Purchases" subtitle="Dealer purchases, costs aur restock log." actions={<Btn variant="primary">+ New Purchase</Btn>} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Total Spent" value={`Rs ${total.toLocaleString()}`} icon={DollarSign} accent="warning" />
        <KpiCard label="Units Acquired" value={qty} icon={Package} accent="info" />
        <KpiCard label="Purchases" value={rows.length} icon={ShoppingBag} accent="primary" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Date", "Dealer", "Tool", "Qty", "Unit Cost", "Total", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p: any) => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.date}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.dealer}</div>
                    <Badge variant="info">{p.dealerCode}</Badge>
                  </td>
                  <td className="px-4 py-3">{p.tool}</td>
                  <td className="px-4 py-3 font-semibold">{p.qty}</td>
                  <td className="px-4 py-3">Rs {p.unitCost.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold">Rs {p.total.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={p.status === "received" ? "success" : "warning"}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
