import { createFileRoute } from "@tanstack/react-router";
import {
  PageHeader, Card, Badge, Btn, Section,
  LoadingTable, EmptyState, Skeleton,
} from "@/components/ui-kit";
import { useMemo, useState } from "react";
import { useDealers } from "@/lib/hooks";
import type { Dealer, DealerStatus } from "@/lib/types";
import { Search, Star, ShieldAlert, Clock, RefreshCw, Users } from "lucide-react";

export const Route = createFileRoute("/_app/dealers")({
  component: DealersPage,
});

const TABLE_HEADERS = ["Code", "Dealer", "Tools", "Lowest", "Avg", "Trust", "Orders", "Status", "Last Active"];
const FILTERS = ["all", "trusted", "pending", "scammer"] as const;
type FilterType = typeof FILTERS[number];

function DealersPage() {
  const { data: rows = [], isLoading, refetch, isRefetching } = useDealers();
  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    return rows.filter((r: Dealer) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.number?.includes(q) ||
        r.dealerCode?.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  const counts = useMemo(() => ({
    trusted: rows.filter((r: Dealer) => r.status === "trusted").length,
    pending: rows.filter((r: Dealer) => r.status === "pending").length,
    scammer: rows.filter((r: Dealer) => r.status === "scammer").length,
  }), [rows]);

  return (
    <>
      <PageHeader
        title="Dealers"
        subtitle="Trust scoring, voting aur dealer intelligence."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-secondary text-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Btn variant="primary">+ Add Dealer</Btn>
          </div>
        }
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </Card>
          ))
        ) : (
          <>
            <Card><div className="text-xs text-muted-foreground">Trusted</div>   <div className="text-2xl font-semibold text-success">{counts.trusted}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Pending Trust</div><div className="text-2xl font-semibold text-warning">{counts.pending}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Scammers</div>   <div className="text-2xl font-semibold text-destructive">{counts.scammer}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Total</div>      <div className="text-2xl font-semibold">{rows.length}</div></Card>
          </>
        )}
      </div>

      {/* ── Filters ── */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-60">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dealers, numbers, codes…"
              className="w-full pl-9 pr-3 h-9 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-9 rounded-md text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-accent"
                }`}
              >
                {f}
                {f !== "all" && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {counts[f as DealerStatus] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={TABLE_HEADERS} rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? "No dealers match your search" : "No dealers found"}
            description={query ? "Try a different name, number, or code." : "Add your first dealer to get started."}
            action={!query ? <Btn variant="primary">+ Add Dealer</Btn> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {TABLE_HEADERS.map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: Dealer) => (
                  <tr key={d.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="info">{d.dealerCode}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-1">
                        {d.name}
                        {d.trust >= 90 && <Star className="h-3 w-3 text-warning fill-warning" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{d.number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(d.tools ?? []).map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-success">Rs {Number(d.lowestPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">Rs {Number(d.avgPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              d.trust >= 80 ? "bg-success" :
                              d.trust >= 50 ? "bg-warning" : "bg-destructive"
                            }`}
                            style={{ width: `${d.trust}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums">{d.trust}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{d.orders}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        d.status === "trusted" ? "success" :
                        d.status === "pending" ? "warning" : "destructive"
                      }>
                        {d.status === "scammer" && <ShieldAlert className="h-3 w-3" />}
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1 align-[-1px]" />
                      {d.lastActive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length} dealers
          </div>
        )}
      </Card>
    </>
  );
}
