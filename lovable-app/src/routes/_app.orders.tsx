import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, LoadingTable, EmptyState, Skeleton } from "@/components/ui-kit";
import { Check, X, Truck, RotateCcw, Eye, ShoppingBag, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useOrders, useUpdateOrderStatus } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});

const STATUS_BADGE: Record<string, "success" | "warning" | "destructive" | "info" | "muted"> = {
  delivered:               "success",
  paid:                    "success",
  awaiting_payment:        "warning",
  awaiting_verification:   "warning",
  pending:                 "info",
  processing:              "info",
  cancelled:               "destructive",
  refunded:                "destructive",
};

const HEADERS = ["Order ID", "Customer", "Tool", "Qty", "Price", "Profit", "Status", "Actions"];

function OrdersPage() {
  const [query, setQuery] = useState("");
  const { data: orders = [], isLoading, refetch, isRefetching } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  const filtered = useMemo(() => {
    if (!query) return orders;
    const q = query.toLowerCase();
    return orders.filter((o: Order) =>
      o.orderId?.toLowerCase().includes(q) ||
      (o.customerName ?? o.customer?.name ?? "").toLowerCase().includes(q) ||
      o.tool?.toLowerCase().includes(q)
    );
  }, [orders, query]);

  async function changeStatus(id: string, status: OrderStatus) {
    await updateStatus.mutateAsync({ id, status });
    toast.success(`Status → ${status}`);
  }

  const stats = {
    total:    orders.length,
    pending:  orders.filter((o: Order) => ["pending", "awaiting_payment", "awaiting_verification"].includes(o.status)).length,
    delivered:orders.filter((o: Order) => o.status === "delivered").length,
    revenue:  orders.reduce((s: number, o: Order) => s + Number(o.sellPrice || 0), 0),
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Approve, deliver, refund — sab orders ek jagah."
        actions={<Btn variant="primary">+ New Order</Btn>}
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-16" /></Card>
          ))
        ) : (
          <>
            <Card><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{stats.total}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-semibold text-warning">{stats.pending}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Delivered</div><div className="text-2xl font-semibold text-success">{stats.delivered}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Revenue</div><div className="text-2xl font-semibold">Rs {stats.revenue.toLocaleString()}</div></Card>
          </>
        )}
      </div>

      {/* ── Search bar ── */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order ID, customer, tool…"
              className="w-full pl-9 pr-3 h-9 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className={cn(
              "h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent transition-colors",
              isRefetching && "opacity-50 cursor-not-allowed"
            )}
          >
            {isRefetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={HEADERS} rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description={query ? "Try a different search term." : "No orders yet. Create your first order."}
            action={!query ? <Btn variant="primary">+ New Order</Btn> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>{HEADERS.map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((o: Order) => (
                  <tr key={o.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{o.orderId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customerName ?? o.customer?.name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{o.whatsapp ?? o.customer?.whatsapp}</div>
                    </td>
                    <td className="px-4 py-3">
                      {o.tool} <span className="text-muted-foreground text-xs">{o.plan}</span>
                    </td>
                    <td className="px-4 py-3">{o.qty ?? o.quantity ?? 1}</td>
                    <td className="px-4 py-3">Rs {Number(o.sellPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-success font-medium">Rs {Number(o.profit || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[o.status] ?? "muted"}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Btn variant="ghost" title="Approve"  onClick={() => changeStatus(o.id, "paid")}><Check className="h-3.5 w-3.5 text-success" /></Btn>
                        <Btn variant="ghost" title="Deliver"  onClick={() => changeStatus(o.id, "delivered")}><Truck className="h-3.5 w-3.5 text-info" /></Btn>
                        <Btn variant="ghost" title="Refund"   onClick={() => changeStatus(o.id, "refunded")}><RotateCcw className="h-3.5 w-3.5 text-warning" /></Btn>
                        <Btn variant="ghost" title="Cancel"   onClick={() => changeStatus(o.id, "cancelled")}><X className="h-3.5 w-3.5 text-destructive" /></Btn>
                        <Btn variant="ghost" title="View"><Eye className="h-3.5 w-3.5" /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {orders.length} orders
          </div>
        )}
      </Card>
    </>
  );
}
