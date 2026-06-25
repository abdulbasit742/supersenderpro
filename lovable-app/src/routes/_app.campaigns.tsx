import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, LoadingTable, EmptyState, Skeleton } from "@/components/ui-kit";
import { Plus, Megaphone } from "lucide-react";
import { useCampaignList } from "@/lib/hooks";
import type { Campaign } from "@/lib/types";

export const Route = createFileRoute("/_app/campaigns")({
  component: CampaignsPage,
});

const HEADERS = ["Name", "Status", "Sent", "Delivered", "Failed", "Scheduled", "Actions"];

const STATUS_BADGE: Record<string, "success" | "info" | "warning" | "destructive" | "muted"> = {
  completed: "success",
  running:   "success",
  scheduled: "info",
  paused:    "warning",
  draft:     "muted",
  failed:    "destructive",
};

function CampaignsPage() {
  const { data: campaigns = [], isLoading, refetch, isRefetching } = useCampaignList();

  const stats = {
    running:   campaigns.filter((c: Campaign) => c.status === "running").length,
    scheduled: campaigns.filter((c: Campaign) => c.status === "scheduled").length,
    completed: campaigns.filter((c: Campaign) => c.status === "completed").length,
    totalSent: campaigns.reduce((s: number, c: Campaign) => s + (c.sentCount ?? 0), 0),
  };

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Multi-channel marketing runs."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isRefetching} className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent disabled:opacity-50">
              {isRefetching ? "Refreshing…" : "Refresh"}
            </button>
            <Btn variant="primary"><Plus className="h-4 w-4" /> New Campaign</Btn>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-12" /></Card>)
        ) : (
          <>
            <Card><div className="text-xs text-muted-foreground">Running</div><div className="text-2xl font-semibold text-success">{stats.running}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Scheduled</div><div className="text-2xl font-semibold text-info">{stats.scheduled}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-semibold">{stats.completed}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Total Sent</div><div className="text-2xl font-semibold">{stats.totalSent.toLocaleString()}</div></Card>
          </>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={HEADERS} rows={4} />
        ) : campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title="No campaigns yet" description="Create your first campaign to reach customers." action={<Btn variant="primary"><Plus className="h-4 w-4" /> New Campaign</Btn>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>{HEADERS.map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {campaigns.map((c: Campaign) => (
                  <tr key={c.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[c.status] ?? "muted"}>{c.status}</Badge></td>
                    <td className="px-4 py-3">{c.sentCount?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-3 text-success">{c.deliveredCount?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-3 text-destructive">{c.failedCount?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3"><Btn variant="ghost">Open</Btn></td>
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
