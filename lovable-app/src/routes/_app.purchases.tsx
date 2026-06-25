import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, KpiCard, LoadingTable, EmptyState, Skeleton } from "@/components/ui-kit";
import { ShoppingBag, DollarSign, Package } from "lucide-react";
import { usePurchases } from "@/lib/hooks";
import type { Purchase } from "@/lib/types";

export const Route = createFileRoute("/_app/purchases")({
  component: PurchasesPage,
});

const HEADERS = ["Date", "Dealer", "Tool", "Qty", "Unit Cost", "Total", "Status"];

function PurchasesPage() {
  const { data: rows = [], isLoading, refetch, isRefetching } = usePurchases();

  const totalSpent = rows.reduce((s, r: Purchase) => s + r.total, 0);
  const totalQty   = rows.reduce((s, r: Purchase) => s + r.qty, 0);

  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle="Dealer purchases, costs aur restock log."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent disabled:opacity-50">
              {isRefetching ? "Refreshing…" : "Refresh"}
            </button>
            <Btn variant="primary">+ New Purchase</Btn>
          </div>
        }
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
              <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-28" /></div>
            </Card>
          ))
        ) : (
          <>
            <KpiCard label="Total Spent"      value={`Rs ${totalSpent.toLocaleString()}`} icon={DollarSign}  accent="warning" />
            <KpiCard label="Units Acquired"   value={totalQty}                             icon={Package}     accent="info" />
            <KpiCard label="Purchase Records" value={rows.length}                          icon={ShoppingBag} accent="primary" />
          </>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={HEADERS} rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No purchases yet" description="Dealer purchases will appear here." action={<Btn variant="primary">+ New Purchase</Btn>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>{HEADERS.map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((p: Purchase) => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.dealer}</div>
                      <Badge variant="info">{p.dealerCode}</Badge>
                    </td>
                    <td className="px-4 py-3">{p.tool}</td>
                    <td className="px-4 py-3 font-semibold">{p.qty}</td>
                    <td className="px-4 py-3">Rs {p.unitCost.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">Rs {p.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "received" ? "success" : p.status === "cancelled" ? "destructive" : "warning"}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
