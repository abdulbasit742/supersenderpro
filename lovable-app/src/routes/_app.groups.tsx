import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, EmptyState, Skeleton, Input } from "@/components/ui-kit";
import { Download, Plus, Trash2, Users2 } from "lucide-react";
import { useState } from "react";
import { useGroups } from "@/lib/hooks";
import { toast } from "sonner";
import type { Group } from "@/lib/types";

export const Route = createFileRoute("/_app/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  const { data: groups = [], isLoading, refetch } = useGroups();
  const [link, setLink] = useState("");

  function handleAdd() {
    if (!link.trim()) { toast.error("Enter a group link or ID"); return; }
    toast.info("Group add feature requires backend connection");
    setLink("");
  }

  return (
    <>
      <PageHeader
        title="Groups"
        subtitle="Selling, customer, source aur dealer groups."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent">Refresh</button>
            <Btn><Download className="h-4 w-4" /> Export</Btn>
            <Btn variant="primary"><Plus className="h-4 w-4" /> Add Group</Btn>
          </div>
        }
      />

      {/* ── Add group ── */}
      <Card className="mb-4">
        <div className="flex gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="WhatsApp group invite link or ID…"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Btn variant="primary" onClick={handleAdd}>Add</Btn>
        </div>
      </Card>

      {/* ── Groups grid ── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-3 w-28 mb-4" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-10 rounded-md" />)}
              </div>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No groups added"
          description="Add a WhatsApp group link to start monitoring rates and activity."
          action={<Btn variant="primary"><Plus className="h-4 w-4" /> Add First Group</Btn>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g: Group) => (
            <Card key={g.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold truncate">{g.name}</div>
                <Badge variant={g.parser === "ok" ? "success" : g.parser === "warn" ? "warning" : "muted"}>{g.parser}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-3">{g.type} • {g.members} members</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div className="bg-muted rounded-md py-2">
                  <div className="text-muted-foreground">Health</div>
                  <div className="font-semibold">{g.health}%</div>
                </div>
                <div className="bg-muted rounded-md py-2">
                  <div className="text-muted-foreground">Data</div>
                  <div className="font-semibold">{g.dataCount}</div>
                </div>
                <div className="bg-muted rounded-md py-2">
                  <div className="text-muted-foreground">Seen</div>
                  <div className="font-semibold truncate">{g.lastSeen}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" className="flex-1">View</Btn>
                <Btn variant="ghost" onClick={() => toast.info("Delete requires confirmation")}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
