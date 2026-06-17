import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn } from "@/components/ui-kit";
import { Zap, Play, Pause, RotateCcw, Clock } from "lucide-react";
import { useState } from "react";
import { zeroTouchJobs } from "@/lib/mock-reseller";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/zero-touch")({
  component: ZeroTouchPage,
});

function ZeroTouchPage() {
  const [jobs, setJobs] = useState(zeroTouchJobs);

  const toggle = (id: string) => {
    setJobs((js) => js.map((j) => j.id === id ? { ...j, status: j.status === "paused" ? "ok" : "paused" } : j));
    toast.success("Job state updated");
  };

  return (
    <>
      <PageHeader
        title="Zero-Touch Automation"
        subtitle="Background jobs jo bina haath lagaye business chala rahe hain."
        actions={<Btn variant="primary"><Zap className="h-4 w-4" /> Run All Now</Btn>}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.map((j) => (
          <Card key={j.id}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold">{j.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" /> {j.schedule}
                </div>
              </div>
              <Badge variant={j.status === "ok" ? "success" : j.status === "warn" ? "warning" : "muted"}>{j.status}</Badge>
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
              <Btn variant="outline" onClick={() => toggle(j.id)}>
                {j.status === "paused" ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><Pause className="h-3.5 w-3.5" /> Pause</>}
              </Btn>
              <Btn onClick={() => toast.success(`${j.name} triggered`)}><RotateCcw className="h-3.5 w-3.5" /> Run now</Btn>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
