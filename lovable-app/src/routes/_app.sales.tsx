import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, KpiCard, LoadingTable, EmptyState, Skeleton } from "@/components/ui-kit";
import { DollarSign, TrendingUp, ShoppingCart, Download } from "lucide-react";
import { useSales } from "@/lib/hooks";
import type { Sale } from "@/lib/types";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
});

const HEADERS = ["Date", "Customer", "Tool", "Qty", "Sell", "Cost", "Profit", "Channel"];

function SalesPage() {
  const { data: rows = [], isLoading, refetch, isRefetching } = useSales();

  const totalRev    = rows.reduce((s, r: Sale) => s + r.sellPrice * r.qty, 0);
  const totalProfit = rows.reduce((s, r: Sale) => s + r.profit, 0);
  const totalQty    = rows.reduce((s, r: Sale) => s + r.qty, 0);

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle="Recent sales, channel breakdown aur profit log."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent disabled:opacity-50">
              {isRefetching ? "Refreshing…" : "Refresh"}
            </button>
            <Btn><Download className="h-4 w-4" /> Export CSV</Btn>
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
            <KpiCard label="Total Revenue" value={`Rs ${totalRev.toLocaleString()}`}    icon={DollarSign}  accent="success" />
            <KpiCard label="Total Profit"  value={`Rs ${totalProfit.toLocaleString()}`} icon={TrendingUp}  accent="success" />
            <KpiCard label="Units Sold"    value={totalQty}                              icon={ShoppingCart} accent="info" />
          </>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={HEADERS} rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No sales yet" description="Sales will appear here after first order delivery." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>{HEADERS.map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((s: Sale) => (
                  <tr key={s.id} className="border-t border-border hover:bg-accent/30 transition-colors">
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
        )}
        {!isLoading && rows.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
            {rows.length} sales records
          </div>
        )}
      </Card>
    </>
  );
}
