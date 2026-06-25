import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, EmptyState, Skeleton } from "@/components/ui-kit";
import { Plus, ArrowRight, Workflow } from "lucide-react";
import { useFlows, useToggleFlow } from "@/lib/hooks";
import { toast } from "sonner";
import type { Flow } from "@/lib/types";

export const Route = createFileRoute("/_app/flows")({
  component: FlowsPage,
});

function FlowsPage() {
  const { data: flows = [], isLoading, refetch } = useFlows();
  const toggleFlow = useToggleFlow();

  async function handleToggle(id: string, name: string, active: boolean) {
    await toggleFlow.mutateAsync(id);
    toast.success(`${name} ${active ? "paused" : "activated"}`);
  }

  return (
    <>
      <PageHeader
        title="Flow Builder"
        subtitle="Visual bot flows — conditions, actions aur automation."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent">Refresh</button>
            <Btn variant="primary"><Plus className="h-4 w-4" /> New Flow</Btn>
          </div>
        }
      />

      {/* ── Flow cards ── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-3 w-20 mb-4" />
              <Skeleton className="h-9 w-full rounded-md" />
            </Card>
          ))}
        </div>
      ) : flows.length === 0 ? (
        <EmptyState icon={Workflow} title="No flows yet" description="Create your first bot flow." action={<Btn variant="primary"><Plus className="h-4 w-4" /> New Flow</Btn>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {flows.map((f: Flow) => (
            <Card key={f.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold">{f.name}</div>
                <Badge variant={f.active ? "success" : "muted"}>{f.active ? "Live" : "Draft"}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-3">{f.nodes} nodes</div>
              <div className="flex gap-2">
                <Btn variant="outline" className="flex-1">
                  Open editor <ArrowRight className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => handleToggle(f.id, f.name, f.active)}>
                  {f.active ? "Pause" : "Activate"}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Canvas placeholder ── */}
      <Card>
        <h2 className="font-semibold mb-3">Flow Canvas Preview</h2>
        <div className="h-64 rounded-lg border-2 border-dashed border-border grid place-items-center text-muted-foreground text-sm">
          <div className="text-center">
            <Workflow className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Select a flow to preview</p>
            <p className="text-xs mt-1">Trigger → Condition → Action</p>
          </div>
        </div>
      </Card>
    </>
  );
}
