import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, LoadingTable, EmptyState, Skeleton } from "@/components/ui-kit";
import { Package } from "lucide-react";
import { useStockInventory } from "@/lib/hooks";
import type { StockItem } from "@/lib/types";

export const Route = createFileRoute("/_app/stock")({
  component: StockPage,
});

const HEADERS = ["Tool", "Plan", "Account Type", "Available", "Total", "Stock Level", "Dealer", "Status"];

function StockPage() {
  const { data: rows = [], isLoading, refetch, isRefetching } = useStockInventory();

  const total = rows.reduce((s, r: StockItem) => s + Number(r.available || 0), 0);
  const low   = rows.filter((r: StockItem) => Number(r.available) > 0 && Number(r.available) <= Number(r.threshold ?? 3)).length;
  const out   = rows.filter((r: StockItem) => Number(r.available) === 0).length;

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle="Account inventory by tool, plan aur warranty type."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent disabled:opacity-50">
              {isRefetching ? "Refreshing…" : "Refresh"}
            </button>
            <Btn variant="primary">+ Add Stock</Btn>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-3 w-24 mb-2" /><Skeleton className="h-8 w-12" /></Card>
          ))
        ) : (
          <>
            <Card><div className="text-xs text-muted-foreground">Total Accounts</div><div className="text-2xl font-semibold">{total}</div></Card>
            <Card><div className="text-xs text-muted-foreground">SKUs</div><div className="text-2xl font-semibold">{rows.length}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Low Stock</div><div className="text-2xl font-semibold text-warning">{low}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Out of Stock</div><div className="text-2xl font-semibold text-destructive">{out}</div></Card>
          </>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={HEADERS} rows={7} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Package} title="No stock items" description="Add your first stock item." action={<Btn variant="primary">+ Add Stock</Btn>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>{HEADERS.map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r: StockItem) => {
                  const qty = Number(r.available ?? 0);
                  const max = Number(r.total ?? 1);
                  const pct = Math.min(100, (qty / Math.max(1, max)) * 100);
                  const s   = qty === 0 ? "out" : qty <= Number(r.threshold ?? 3) ? "low" : "ok";
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 font-semibold capitalize">{r.tool}</td>
                      <td className="px-4 py-3 capitalize">{r.plan}</td>
                      <td className="px-4 py-3"><Badge variant="muted">{r.accountType}</Badge></td>
                      <td className="px-4 py-3 font-bold">{qty}</td>
                      <td className="px-4 py-3 text-muted-foreground">{max}</td>
                      <td className="px-4 py-3 w-44">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all ${s === "ok" ? "bg-success" : s === "low" ? "bg-warning" : "bg-destructive"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="info">{r.dealerCode ?? "—"}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={s === "ok" ? "success" : s === "low" ? "warning" : "destructive"}>
                          {s === "ok" ? "Healthy" : s === "low" ? "Low" : "Out"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
