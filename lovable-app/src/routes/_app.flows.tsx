import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge } from "@/components/ui-kit";
import { Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/flows")({
  component: FlowsPage,
});

const flows = [
  { name: "AI Tools Greeting", nodes: 8, active: true },
  { name: "Laptop Lead Qualify", nodes: 12, active: true },
  { name: "Payment Confirm", nodes: 6, active: false },
];

function FlowsPage() {
  return (
    <>
      <PageHeader title="Flow Builder" subtitle="Visual bot flows — drag & drop." actions={<Btn variant="primary"><Plus className="h-4 w-4" /> New Flow</Btn>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {flows.map((f) => (
          <Card key={f.name}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{f.name}</div>
              <Badge variant={f.active ? "success" : "muted"}>{f.active ? "Live" : "Draft"}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{f.nodes} nodes</div>
            <Btn variant="outline" className="mt-3 w-full">Open editor <ArrowRight className="h-3.5 w-3.5" /></Btn>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="font-semibold mb-3">Canvas preview</h2>
        <div className="h-64 rounded-lg border-2 border-dashed border-border grid place-items-center text-muted-foreground text-sm">
          Drag nodes here — Trigger → Condition → Action
        </div>
      </Card>
    </>
  );
}
