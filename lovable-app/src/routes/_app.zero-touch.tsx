import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, Skeleton } from "@/components/ui-kit";
import { Zap, Play, Pause, RotateCcw, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useZeroTouchJobs } from "@/lib/hooks";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ZeroTouchJob } from "@/lib/types";

export const Route = createFileRoute("/_app/zero-touch")({
  component: ZeroTouchPage,
});

function ZeroTouchPage() {
  const { data: jobs = [], isLoading, refetch } = useZeroTouchJobs();
  const qc = useQueryClient();

  async function runJob(job: ZeroTouchJob) {
    const t = toast.loading(`Running ${job.name}…`);
    try {
      await api.raw.post(`/api/zero-touch/jobs/${job.id}/run`);
      toast.success(`${job.name} triggered`, { id: t });
      qc.invalidateQueries({ queryKey: ["zero-touch"] });
    } catch {
      toast.error(`Failed to run ${job.name}`, { id: t });
    }
  }

  async function toggleJob(job: ZeroTouchJob) {
    const action = job.status === "paused" ? "resume" : "pause";
    const t = toast.loading(`${action === "resume" ? "Resuming" : "Pausing"} ${job.name}…`);
    try {
      await api.raw.post(`/api/zero-touch/jobs/${job.id}/${action}`);
      toast.success(`${job.name} ${action}d`, { id: t });
      qc.invalidateQueries({ queryKey: ["zero-touch"] });
    } catch {
      toast.error(`Failed — demo mode`, { id: t });
    }
  }

  const stats = {
    running: jobs.filter((j: ZeroTouchJob) => j.status === "ok").length,
    paused:  jobs.filter((j: ZeroTouchJob) => j.status === "paused").length,
    warn:    jobs.filter((j: ZeroTouchJob) => j.status === "warn" || j.status === "error").length,
  };

  return (
    <>
      <PageHeader
        title="Zero-Touch Automation"
        subtitle="Background jobs jo bina haath lagaye business chala rahe hain."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent">Refresh</button>
            <Btn variant="primary" onClick={() => toast.info("Run all — connect backend")}>
              <Zap className="h-4 w-4" /> Run All Now
            </Btn>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Card key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-10" /></Card>)
        ) : (
          <>
            <Card><div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">Running</span></div><div className="text-2xl font-semibold text-success">{stats.running}</div></Card>
            <Card><div className="flex items-center gap-2 mb-1"><Pause className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Paused</span></div><div className="text-2xl font-semibold">{stats.paused}</div></Card>
            <Card><div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Warnings</span></div><div className="text-2xl font-semibold text-warning">{stats.warn}</div></Card>
          </>
        )}
      </div>

      {/* ── Job cards ── */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-3 w-28 mb-4" />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Skeleton className="h-10 rounded-md" />
                <Skeleton className="h-10 rounded-md" />
              </div>
              <div className="flex gap-2"><Skeleton className="h-9 flex-1 rounded-md" /><Skeleton className="h-9 flex-1 rounded-md" /></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((j: ZeroTouchJob) => (
            <Card key={j.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">{j.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" /> {j.schedule}
                  </div>
                </div>
                <Badge variant={j.status === "ok" ? "success" : j.status === "warn" ? "warning" : j.status === "paused" ? "muted" : "destructive"}>
                  {j.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs my-3">
                <div className="rounded-md bg-muted p-2">
                  <div className="text-muted-foreground">Last run</div>
                  <div className="font-medium">{j.lastRun}</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="text-muted-foreground">Next run</div>
                  <div className="font-medium">{j.nextRun}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" className="flex-1" onClick={() => toggleJob(j)}>
                  {j.status === "paused"
                    ? <><Play className="h-3.5 w-3.5" /> Resume</>
                    : <><Pause className="h-3.5 w-3.5" /> Pause</>
                  }
                </Btn>
                <Btn className="flex-1" onClick={() => runJob(j)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Run now
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
