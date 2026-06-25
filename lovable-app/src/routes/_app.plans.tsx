import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Skeleton } from "@/components/ui-kit";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Check, X, Send, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlans } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { Plan } from "@/lib/types";

export const Route = createFileRoute("/_app/plans")({
  component: PlansPage,
});

const PLAN_CATEGORIES = ["All", "ChatGPT", "Claude", "Gemini", "Canva", "LinkedIn", "Other"];
type Filter = "all" | "available" | "not-available" | "stock";

function PlansPage() {
  const { data: plans = [], isLoading, refetch } = usePlans();
  const [cat, setCat] = useState<string>("All");
  const [filter, setFilter] = useState<Filter>("all");
  const qc = useQueryClient();

  const filtered = useMemo(() => {
    const allCats = [...new Set(plans.map((p: Plan) => p.category))];
    return plans.filter((p: Plan) => {
      if (cat !== "All" && p.category !== cat) return false;
      if (filter === "available" && !p.available) return false;
      if (filter === "not-available" && p.available) return false;
      return true;
    });
  }, [plans, cat, filter]);

  const categories = useMemo(() => {
    const cats = [...new Set(plans.map((p: Plan) => p.category))];
    return ["All", ...cats];
  }, [plans]);

  const setAvail = async (id: string, available: boolean) => {
    await api.updatePlanAvailability(id, available);
    qc.invalidateQueries({ queryKey: ["plans"] });
    toast.success(`Marked ${available ? "Available" : "Not Available"}. Bot replies updated.`);
  };

  return (
    <>
      <PageHeader
        title="Plans Manager"
        subtitle="Categories, pricing aur availability. Bot replies sync hote hain."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent">Refresh</button>
            <Btn variant="primary">+ Add Plan</Btn>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all","available","not-available","stock"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border border-border",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-accent"
            )}
          >
            {f === "all" ? "All" : f === "available" ? "Available" : f === "not-available" ? "Not Available" : "All Stock"}
          </button>
        ))}
        <div className="mx-2 h-6 w-px bg-border" />
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border border-border",
              cat === c ? "bg-accent text-foreground border-primary/40" : "bg-secondary hover:bg-accent"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <Skeleton className="h-28 w-full rounded-lg mb-3" />
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-5 w-24 mb-3" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 rounded-md" />
                <Skeleton className="h-8 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p: Plan) => (
            <Card key={p.id} className="flex flex-col">
              <div className="h-28 rounded-lg bg-gradient-to-br from-primary/30 via-info/20 to-transparent mb-3 grid place-items-center text-4xl">
                {p.emoji}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                  <div className="font-semibold truncate">{p.name}</div>
                </div>
                <Badge variant={p.available ? "success" : "destructive"}>
                  {p.available ? "Available" : "N/A"}
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold">PKR {p.pricePkr.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ {p.duration}</span>
              </div>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1 flex-1">
                {p.features.slice(0,3).map((f) => <li key={f}>• {f}</li>)}
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {p.available ? (
                  <Btn variant="outline" onClick={() => setAvail(p.id, false)}><X className="h-3.5 w-3.5" /> Mark N/A</Btn>
                ) : (
                  <Btn variant="primary" onClick={() => setAvail(p.id, true)}><Check className="h-3.5 w-3.5" /> Mark Avail</Btn>
                )}
                <Btn onClick={() => { api.forwardPlan(p.id, "channel"); toast.success("Forwarded to WhatsApp"); }}>
                  <Send className="h-3.5 w-3.5" /> Forward
                </Btn>
                <Btn variant="ghost"><Pencil className="h-3.5 w-3.5" /> Edit</Btn>
                <Btn variant="ghost" onClick={() => toast.warning("Confirm in real app")}><Trash2 className="h-3.5 w-3.5" /> Delete</Btn>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No plans match the current filter.
            </div>
          )}
        </div>
      )}
    </>
  );
}
