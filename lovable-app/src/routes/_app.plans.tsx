import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge } from "@/components/ui-kit";
import { useMemo, useState, useEffect } from "react";
import { mockPlans, planCategories, type Plan } from "@/lib/mock";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Check, X, Send, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/plans")({
  component: PlansPage,
});

type Filter = "all" | "available" | "not-available" | "stock";

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>(mockPlans);
  const [cat, setCat] = useState<string>("All");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api.getPlans().then((p) => { if (p && Array.isArray(p) && p.length) setPlans(p as Plan[]); });
  }, []);

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (cat !== "All" && p.category !== cat) return false;
      if (filter === "available" && !p.available) return false;
      if (filter === "not-available" && p.available) return false;
      return true;
    });
  }, [plans, cat, filter]);

  const setAvail = async (id: string, available: boolean) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, available } : p)));
    await api.updatePlanAvailability(id, available);
    toast.success(`Marked ${available ? "Available" : "Not Available"}. Bot replies updated.`);
  };

  return (
    <>
      <PageHeader
        title="Plans Manager"
        subtitle="Categories, pricing aur availability. Bot replies sync hote hain."
        actions={<Btn variant="primary">+ Add Plan</Btn>}
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
        {["All", ...planCategories].map((c) => (
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
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
                {p.available ? "Available" : "Not Available"}
              </Badge>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold">PKR {p.pricePkr.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">/ {p.duration}</span>
            </div>
            <ul className="mt-2 text-xs text-muted-foreground space-y-1">
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
      </div>
    </>
  );
}
