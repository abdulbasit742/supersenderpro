import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Input } from "@/components/ui-kit";
import { groups } from "@/lib/mock";
import { Download, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  return (
    <>
      <PageHeader title="Groups" subtitle="Selling, customer, source aur dealer groups." actions={
        <>
          <Btn><Download className="h-4 w-4" /> Export Data</Btn>
          <Btn variant="primary"><Plus className="h-4 w-4" /> Add Group</Btn>
        </>
      } />
      <Card className="mb-4 grid sm:grid-cols-[1fr_auto] gap-2">
        <Input placeholder="WhatsApp group invite link or ID" />
        <Btn variant="primary">Add</Btn>
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <Card key={g.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{g.name}</div>
                <div className="text-xs text-muted-foreground">{g.type} • {g.members} members</div>
              </div>
              <Badge variant={g.parser === "ok" ? "success" : "warning"}>{g.parser}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="Health" value={`${g.health}%`} />
              <Stat label="Data" value={String(g.dataCount)} />
              <Stat label="Seen" value={g.lastSeen} />
            </div>
            <div className="mt-3 flex gap-2">
              <Btn variant="outline" className="flex-1">View</Btn>
              <Btn variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Btn>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-md py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
