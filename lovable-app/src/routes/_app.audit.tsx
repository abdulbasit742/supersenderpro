import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge } from "@/components/ui-kit";
import { Activity, Filter, RefreshCw, Shield } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAuditEvents, getAuditStats } from "@/lib/audit.functions";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

const severityMap: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "muted"> = {
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "destructive",
  muted: "muted",
};

function AuditPage() {
  const [q, setQ] = useState("");
  const queryClient = useQueryClient();
  const fetchEvents = useServerFn(listAuditEvents);
  const fetchStats = useServerFn(getAuditStats);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events"],
    queryFn: () => fetchEvents(),
  });

  const { data: stats } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: () => fetchStats(),
  });

  const filtered = events.filter(
    (e: any) =>
      `${e.user_name ?? ""} ${e.action ?? ""} ${e.target ?? ""} ${e.target_type ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Sensitive actions ka complete trail." />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Events</div>
          <div className="text-xl font-semibold">{stats?.total ?? 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Info</div>
          <div className="text-xl font-semibold text-blue-500">{stats?.breakdown?.info ?? 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Success</div>
          <div className="text-xl font-semibold text-green-500">{stats?.breakdown?.success ?? 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Warnings</div>
          <div className="text-xl font-semibold text-yellow-500">{stats?.breakdown?.warning ?? 0}</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by user, action, target…"
            className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm"
          />
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["audit-events"] })}
            className="h-9 px-3 rounded-md bg-secondary border border-border text-sm flex items-center gap-1.5 hover:bg-secondary/80"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2">Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2.5"><div className="h-3 w-24 bg-muted rounded animate-pulse" /></td>
                    <td><div className="h-3 w-20 bg-muted rounded animate-pulse" /></td>
                    <td><div className="h-3 w-32 bg-muted rounded animate-pulse" /></td>
                    <td><div className="h-3 w-20 bg-muted rounded animate-pulse" /></td>
                    <td><div className="h-3 w-14 bg-muted rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No audit events found.
                  </td>
                </tr>
              ) : (
                filtered.map((e: any) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                      <Activity className="h-3 w-3 inline mr-1" />
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="font-medium">{e.user_name ?? "—"}</td>
                    <td>{e.action}</td>
                    <td className="text-muted-foreground">{e.target ?? "—"}</td>
                    <td>
                      <Badge variant={severityMap[e.severity] ?? "default"}>{e.severity}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
