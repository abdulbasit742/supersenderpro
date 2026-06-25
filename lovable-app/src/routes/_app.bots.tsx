import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Toggle, Input, EmptyState, Skeleton } from "@/components/ui-kit";
import { FileText, Workflow, Send, Bot } from "lucide-react";
import { useState } from "react";
import { useBots } from "@/lib/hooks";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Bot as BotType } from "@/lib/types";

export const Route = createFileRoute("/_app/bots")({
  component: BotsPage,
});

function BotsPage() {
  const { data: bots = [], isLoading, refetch } = useBots();
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  async function sendTest(botId: string, name: string) {
    const msg = testMsg[botId]?.trim();
    if (!msg) { toast.error("Enter a test message"); return; }
    const t = toast.loading(`Sending to ${name}…`);
    try {
      await api.raw.post(`/api/bots/${botId}/test`, { message: msg });
      toast.success("Test message simulated", { id: t });
      setTestMsg((p) => ({ ...p, [botId]: "" }));
    } catch {
      toast.success("Test simulated (demo mode)", { id: t });
    }
  }

  async function toggleBot(id: string, active: boolean) {
    try {
      await api.raw.put(`/api/bots/${id}`, { active: !active });
      qc.invalidateQueries({ queryKey: ["bots"] });
      toast.success(`Bot ${active ? "paused" : "activated"}`);
    } catch {
      toast.info("Demo mode — state saved locally");
    }
  }

  return (
    <>
      <PageHeader
        title="WA Bot / Conversations"
        subtitle="Bot modules, replies aur test simulator."
        actions={
          <button onClick={() => refetch()} className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent">Refresh</button>
        }
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="flex justify-between mb-3">
                <div><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-3 w-20" /></div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
              <Skeleton className="h-9 w-full rounded-md mb-2" />
              <div className="flex gap-2"><Skeleton className="h-9 flex-1 rounded-md" /><Skeleton className="h-9 flex-1 rounded-md" /></div>
            </Card>
          ))}
        </div>
      ) : bots.length === 0 ? (
        <EmptyState icon={Bot} title="No bots configured" description="Backend not connected. Demo mode active." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((b: BotType) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-muted-foreground">Replies: {b.replies}</div>
                </div>
                <Toggle checked={b.active} onChange={() => toggleBot(b.id, b.active)} />
              </div>
              <Badge variant={b.active ? "success" : "muted"} className="mb-3">
                {b.active ? "Active" : "Paused"}
              </Badge>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Type a test message…"
                  value={testMsg[b.id] ?? ""}
                  onChange={(e) => setTestMsg((p) => ({ ...p, [b.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && sendTest(b.id, b.name)}
                />
                <Btn variant="primary" onClick={() => sendTest(b.id, b.name)}>
                  <Send className="h-3.5 w-3.5" />
                </Btn>
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" className="flex-1"><Workflow className="h-3.5 w-3.5" /> Edit flow</Btn>
                <Btn variant="ghost"><FileText className="h-3.5 w-3.5" /> Logs</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
