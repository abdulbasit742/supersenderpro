import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Skeleton } from "@/components/ui-kit";
import { Store, Globe, ShoppingBag, Package, RefreshCw, ExternalLink, AlertCircle, CheckCircle2, PauseCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { syncToMarketplace } from "@/lib/marketplace.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { EcommerceAccount, MarketplaceListing } from "@/lib/types";

export const Route = createFileRoute("/_app/marketplaces")({
  component: MarketplacesPage,
});

const platformMeta: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  daraz:   { label: "Daraz",   icon: ShoppingBag, color: "text-orange-500" },
  etsy:    { label: "Etsy",    icon: Store,       color: "text-orange-400" },
  amazon:  { label: "Amazon",  icon: Globe,       color: "text-blue-500"   },
  shopify: { label: "Shopify", icon: Package,     color: "text-green-500"  },
};

function MarketplacesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const doSync = useServerFn(syncToMarketplace);

  const { data, isLoading } = useQuery<{ listings: MarketplaceListing[]; accounts: EcommerceAccount[] }>({
    queryKey: ["marketplaces", user?.id],
    queryFn: async () => {
      if (!user) return { listings: [], accounts: [] };
      const [{ data: l }, { data: a }] = await Promise.all([
        supabase.from("marketplace_listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ecommerce_accounts").select("*").eq("user_id", user.id),
      ]);
      return { listings: (l ?? []) as MarketplaceListing[], accounts: (a ?? []) as EcommerceAccount[] };
    },
    enabled: !!user,
    staleTime: 30_000,
    placeholderData: { listings: [], accounts: [] },
  });

  const listings = data?.listings ?? [];

  async function syncListing(id: string) {
    toast.info("Syncing to marketplace…");
    try {
      const res = await doSync({ data: { listingId: id } });
      toast.success((res as { message?: string }).message ?? "Synced");
      qc.invalidateQueries({ queryKey: ["marketplaces"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
  }

  async function pauseListing(id: string) {
    const { error } = await supabase.from("marketplace_listings").update({ status: "paused" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Paused"); qc.invalidateQueries({ queryKey: ["marketplaces"] }); }
  }

  async function deleteListing(id: string) {
    if (!confirm("Delete this draft/listing?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["marketplaces"] }); }
  }

  const filtered = filter === "all" ? listings : listings.filter((l) => l.platform === filter);
  const grouped  = filtered.reduce<Record<string, MarketplaceListing[]>>((acc, l) => {
    if (!acc[l.platform]) acc[l.platform] = [];
    acc[l.platform].push(l);
    return acc;
  }, {});

  const stats = {
    total:     listings.length,
    published: listings.filter((l) => l.status === "published").length,
    draft:     listings.filter((l) => l.status === "draft").length,
    error:     listings.filter((l) => l.status === "error").length,
  };

  return (
    <>
      <PageHeader title="Marketplaces" subtitle="Apne products ko Daraz, Etsy, Amazon aur Shopify pe manage karein." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3 text-center">
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-14 mx-auto" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total"     value={stats.total}     />
            <StatCard label="Published" value={stats.published} color="success"     />
            <StatCard label="Drafts"    value={stats.draft}     color="muted"       />
            <StatCard label="Errors"    value={stats.error}     color="destructive" />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "daraz", "etsy", "amazon", "shopify"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-9 px-3 rounded-md text-sm border border-border",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-accent"
            )}
          >
            {f === "all" ? "All Platforms" : (platformMeta[f]?.label ?? f)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
              <Skeleton className="h-10 w-10 rounded-md shrink-0" />
              <div className="flex-1"><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-28" /></div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <div className="flex gap-1">{Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-8 w-8 rounded-md" />)}</div>
            </div>
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Koi listings nahi hain. Catalog page pe product select kar ke "Publish" karein.
        </Card>
      ) : (
        Object.entries(grouped).map(([platform, items]) => {
          const meta = platformMeta[platform];
          const Icon = meta?.icon ?? Package;
          return (
            <div key={platform} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn("h-4 w-4", meta?.color)} />
                <h3 className="font-semibold">{meta?.label ?? platform}</h3>
                <Badge variant="muted">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                    <div className="h-10 w-10 rounded-md bg-muted grid place-items-center text-lg shrink-0">📦</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.product_id}</div>
                      <div className="text-xs text-muted-foreground">Not synced yet</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === "published" && <span className="text-xs inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Published</span>}
                      {item.status === "draft"     && <span className="text-xs inline-flex items-center gap-1 text-muted-foreground"><AlertCircle className="h-3 w-3" /> Draft</span>}
                      {item.status === "error"     && <span className="text-xs inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> Error</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => syncListing(item.id)} className="h-8 w-8 rounded-md hover:bg-accent grid place-items-center" title="Sync"><RefreshCw className="h-3.5 w-3.5" /></button>
                      <button onClick={() => pauseListing(item.id)} className="h-8 w-8 rounded-md hover:bg-accent grid place-items-center" title="Pause"><PauseCircle className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteListing(item.id)} className="h-8 w-8 rounded-md hover:bg-accent grid place-items-center text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <div className={cn("text-xl font-bold", color ? `text-${color}` : "")}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
