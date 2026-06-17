import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, Section } from "@/components/ui-kit";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { trustedDealersData } from "@/lib/mock-reseller";
import { Search, Star, ShieldAlert, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/dealers")({
  component: DealersPage,
});

function DealersPage() {
  const [rows, setRows] = useState(trustedDealersData);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "trusted" | "pending" | "scammer">("all");

  useEffect(() => {
    Promise.all([
      api.raw.get<any[]>("/api/dealer-intelligence/trusted"),
      api.raw.get<any[]>("/api/dealer-intelligence/pending"),
      api.raw.get<any[]>("/api/dealer-intelligence/scammers"),
    ]).then(([t, p, s]) => {
      const merged = [
        ...(t || []).map((r) => ({ ...r, status: "trusted" })),
        ...(p || []).map((r) => ({ ...r, status: "pending" })),
        ...(s || []).map((r) => ({ ...r, status: "scammer" })),
      ];
      if (merged.length) setRows(merged as any);
    });
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return r.name?.toLowerCase().includes(q) || r.number?.includes(q) || r.dealerCode?.toLowerCase().includes(q);
    });
  }, [rows, query, filter]);

  const counts = {
    trusted: rows.filter((r) => r.status === "trusted").length,
    pending: rows.filter((r) => r.status === "pending").length,
    scammer: rows.filter((r) => r.status === "scammer").length,
  };

  return (
    <>
      <PageHeader
        title="Dealers"
        subtitle="Trust scoring, voting aur dealer intelligence."
        actions={<Btn variant="primary">+ Add Dealer</Btn>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><div className="text-xs text-muted-foreground">Trusted</div><div className="text-2xl font-semibold text-success">{counts.trusted}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Pending Trust</div><div className="text-2xl font-semibold text-warning">{counts.pending}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Scammers</div><div className="text-2xl font-semibold text-destructive">{counts.scammer}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{rows.length}</div></Card>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-60">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dealers, numbers, codes…"
              className="w-full pl-9 pr-3 h-9 rounded-md bg-secondary border border-border text-sm"
            />
          </div>
          {(["all", "trusted", "pending", "scammer"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 h-9 rounded-md text-sm font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Code", "Dealer", "Tools", "Lowest", "Avg", "Trust", "Orders", "Status", "Last Active"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d: any) => (
                <tr key={d.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-3"><Badge variant="info">{d.dealerCode}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-1">
                      {d.name}
                      {d.trust >= 90 && <Star className="h-3 w-3 text-warning fill-warning" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">{d.number}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(d.tools || []).map((t: string) => <Badge key={t} variant="muted">{t}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-success">Rs {Number(d.lowestPrice || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">Rs {Number(d.avgPrice || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${d.trust >= 80 ? "bg-success" : d.trust >= 50 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${d.trust}%` }} />
                      </div>
                      <span className="text-xs font-mono">{d.trust}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{d.orders}</td>
                  <td className="px-4 py-3">
                    <Badge variant={d.status === "trusted" ? "success" : d.status === "pending" ? "warning" : "destructive"}>
                      {d.status === "scammer" && <ShieldAlert className="h-3 w-3" />}
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{d.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
