import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn } from "@/components/ui-kit";
import { Gift, Users, Trophy } from "lucide-react";
import { giveawaysData } from "@/lib/mock-reseller";

export const Route = createFileRoute("/_app/giveaways")({
  component: GiveawaysPage,
});

function GiveawaysPage() {
  return (
    <>
      <PageHeader
        title="Giveaways"
        subtitle="Weekly draws, entries aur winner selection."
        actions={<Btn variant="primary"><Gift className="h-4 w-4" /> New Giveaway</Btn>}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {giveawaysData.map((g) => {
          const pct = Math.min(100, (g.entries / g.target) * 100);
          return (
            <Card key={g.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary grid place-items-center">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="font-semibold">{g.name}</div>
                </div>
                <Badge variant={g.status === "active" ? "success" : "muted"}>{g.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-3">Prize: <span className="text-foreground font-medium">{g.prize}</span></div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {g.entries} entries</span>
                <span className="text-muted-foreground">target {g.target}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Ends in: <span className="font-medium text-foreground">{g.endsIn}</span></div>
                <Btn variant="outline">{g.status === "active" ? "Pick winner" : "View winner"}</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
