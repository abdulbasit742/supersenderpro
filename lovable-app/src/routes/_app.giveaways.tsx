import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, Skeleton } from "@/components/ui-kit";
import { Gift, Users, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { giveawaysData } from "@/lib/mock-reseller";
import type { Giveaway } from "@/lib/types";

export const Route = createFileRoute("/_app/giveaways")({
  component: GiveawaysPage,
});

function GiveawaysPage() {
  const { data: giveaways = giveawaysData as Giveaway[], isLoading } = useQuery<Giveaway[]>({
    queryKey: ["giveaways"],
    queryFn: async () => {
      const data = await api.raw.get<Giveaway[]>("/api/giveaways");
      return data?.length ? data : (giveawaysData as Giveaway[]);
    },
    staleTime: 60_000,
    placeholderData: giveawaysData as Giveaway[],
  });

  return (
    <>
      <PageHeader
        title="Giveaways"
        subtitle="Weekly draws, entries aur winner selection."
        actions={<Btn variant="primary"><Gift className="h-4 w-4" /> New Giveaway</Btn>}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-40 mb-3" />
              <Skeleton className="h-2 w-full rounded-full mb-3" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </Card>
          ))
        ) : (
          giveaways.map((g: Giveaway) => {
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
                <div className="text-sm text-muted-foreground mb-3">
                  Prize: <span className="text-foreground font-medium">{g.prize}</span>
                </div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {g.entries} entries
                  </span>
                  <span className="text-muted-foreground">target {g.target}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Ends in: <span className="font-medium text-foreground">{g.endsIn}</span>
                  </div>
                  <Btn variant="outline">{g.status === "active" ? "Pick winner" : "View winner"}</Btn>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
