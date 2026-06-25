import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, LoadingTable, EmptyState, Skeleton } from "@/components/ui-kit";
import { MessageCircle, Ban, Users, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useCustomerList } from "@/lib/hooks";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

const HEADERS = ["Name", "WhatsApp", "Tags", "Orders", "Spent", "Last Message", "Actions"];

function CustomersPage() {
  const [query, setQuery] = useState("");
  const { data: customers = [], isLoading, refetch, isRefetching } = useCustomerList();

  const filtered = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter((c: Customer) =>
      c.name?.toLowerCase().includes(q) ||
      c.whatsapp?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [customers, query]);

  const stats = {
    total:  customers.length,
    vip:    customers.filter((c: Customer) => (c.tags ?? []).includes("vip")).length,
    revenue:customers.reduce((s: number, c: Customer) => s + Number(c.totalSpend || 0), 0),
  };

  return (
    <>
      <PageHeader
        title="Customers CRM"
        subtitle="Leads, VIP tiers aur message history."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent disabled:opacity-50">
              {isRefetching ? "Refreshing…" : "Refresh"}
            </button>
            <Btn variant="primary">+ Add Customer</Btn>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-16" /></Card>
          ))
        ) : (
          <>
            <Card><div className="text-xs text-muted-foreground">Total Customers</div><div className="text-2xl font-semibold">{stats.total}</div></Card>
            <Card><div className="text-xs text-muted-foreground">VIP</div><div className="text-2xl font-semibold text-warning">{stats.vip}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Total Spent</div><div className="text-2xl font-semibold text-success">Rs {stats.revenue.toLocaleString()}</div></Card>
          </>
        )}
      </div>

      {/* ── Search ── */}
      <Card className="mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, WhatsApp, email…"
            className="w-full pl-9 pr-3 h-9 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </Card>

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={HEADERS} rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={query ? "No customers match" : "No customers yet"} description={query ? "Try a different search." : "Add your first customer."} action={!query ? <Btn variant="primary">+ Add Customer</Btn> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>{HEADERS.map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((c: Customer) => (
                  <tr key={c.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.whatsapp}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).map((t) => (
                          <Badge key={t} variant={t === "vip" ? "warning" : "muted"}>{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.totalOrders ?? 0}</td>
                    <td className="px-4 py-3">Rs {Number(c.totalSpend || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Btn variant="ghost" title="WhatsApp"><MessageCircle className="h-3.5 w-3.5 text-success" /></Btn>
                        <Btn variant="ghost" title="Ban"><Ban className="h-3.5 w-3.5 text-destructive" /></Btn>
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
            {filtered.length} of {customers.length} customers
          </div>
        )}
      </Card>
    </>
  );
}
