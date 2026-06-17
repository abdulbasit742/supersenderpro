import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Toggle, Input } from "@/components/ui-kit";
import { bots } from "@/lib/mock";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Workflow, Send } from "lucide-react";

export const Route = createFileRoute("/_app/bots")({
  component: BotsPage,
});

function BotsPage() {
  const [list, setList] = useState(bots);
  return (
    <>
      <PageHeader title="WA Bot / Conversations" subtitle="Bot modules, replies aur test simulator." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-muted-foreground">Replies: {b.replies}</div>
              </div>
              <Toggle checked={b.active} onChange={(v) => setList((p) => p.map((x) => x.id === b.id ? { ...x, active: v } : x))} />
            </div>
            <div className="mt-3">
              <Badge variant={b.active ? "success" : "muted"}>{b.active ? "Active" : "Paused"}</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Type a test message…" />
              <Btn variant="primary" onClick={() => toast.success("Test message simulated")}><Send className="h-3.5 w-3.5" /></Btn>
            </div>
            <div className="mt-3 flex gap-2">
              <Btn variant="outline"><Workflow className="h-3.5 w-3.5" /> Edit flow</Btn>
              <Btn variant="ghost"><FileText className="h-3.5 w-3.5" /> View logs</Btn>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
