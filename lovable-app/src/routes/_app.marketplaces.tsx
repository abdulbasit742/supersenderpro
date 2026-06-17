import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge } from "@/components/ui-kit";
import { Store, Globe, ShoppingBag, Package, RefreshCw, ExternalLink, AlertCircle, CheckCircle2, PauseCircle, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { syncToMarketplace } from "@/lib/marketplace.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/marketplaces")({
  component: MarketplacesPage,
});

const platformMeta: Record<string, { label: string; icon: any; color: string }> = {
  daraz: { label: "Daraz", icon: ShoppingBag, color: "text-orange-500" },
  etsy: { label: "Etsy", icon: Store, color: "text-orange-400" },
  amazon: { label: "Amazon", icon: Globe, color: "text-blue-500" },
  shopify: { label: "Shopify", icon: Package, color: "text-green-500" },
};

function MarketplacesPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [{ data: l }, { data: a }] = await Promise.all([
      supabase.from("marketplace_listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ecommerce_accounts").select("*").eq("user_id", user.id),
    ]);
    setListings(l ?? []);
    setAccounts(a ?? []);
  }

  const doSync = useServerFn(syncToMarketplace);

  async function syncListing(id: string) {
    toast.info("Syncing to marketplace…");
    try {
      const res = await doSync({ data: { listingId: id } });
      toast.success(res.message);
      loadData();
    } catch (e: any) {
      toast.error(e.message ?? "Sync failed");
    }
  }

  async function pauseListing(id: string) {
    const { error } = await supabase.from("marketplace_listings").update({ status: "paused" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Paused"); loadData(); }
  }

  async function deleteListing(id: string) {
    if (!confirm("Delete this draft/listing?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); loadData(); }
  }

  const filtered = filter === "all" ? listings : listings.filter(l => l.platform === filter);
  const grouped: Record<string, any[]> = filtered.reduce((acc, l) => {
    const p = l.platform;
    if (!acc[p]) acc[p] = [];
    acc[p].push(l);
    return acc;
  }, {} as Record<string, any[]>);

  const stats = {
    total: listings.length,
    published: listings.filter(l => l.status === "published").length,
    draft: listings.filter(l => l.status === "draft").length,
    paused: listings.filter(l => l.status === "paused").length,
    error: listings.filter(l => l.status === "error").length,
  };

  return (
    <>
      <PageHeader title="Marketplaces" subtitle="Apne products ko Daraz, Etsy, Amazon aur Shopify pe manage karein." />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Published" value={stats.published} color="success" />
        <StatCard label="Drafts" value={stats.draft} color="muted" />
        <StatCard label="Paused" value={stats.paused} color="warning" />
        <StatCard label="Errors" value={stats.error} color="destructive" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "daraz", "etsy", "amazon", "shopify"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-9 px-3 rounded-md text-sm border border-border",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-accent"
            )}
          >
            {f === "all" ? "All Platforms" : platformMeta[f]?.label ?? f}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Koi listings nahi hain. Catalog page pe product select kar ke "Publish" karein.
        </Card>
      ) : (
        Object.entries(grouped).map(([platform, items]: any) => {
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
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                    <div className="h-10 w-10 rounded-md bg-muted grid place-items-center text-lg shrink-0">📦</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.product_id}</div>
                      <div className="text-xs text-muted-foreground">{item.listing_id ? `Listing: ${item.listing_id}` : "Not synced yet"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === "published" && <span className="text-xs inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Published</span>}
                      {item.status === "draft" && <span className="text-xs inline-flex items-center gap-1 text-muted-foreground"><AlertCircle className="h-3 w-3" /> Draft</span>}
                      {item.status === "paused" && <span className="text-xs inline-flex items-center gap-1 text-warning"><PauseCircle className="h-3 w-3" /> Paused</span>}
                      {item.status === "error" && <span className="text-xs inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> Error</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => syncListing(item.id)} className="h-8 w-8 rounded-md hover:bg-accent grid place-items-center" title="Sync"><RefreshCw className="h-3.5 w-3.5" /></button>
                      {item.listing_url && (
                        <a href={item.listing_url} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-md hover:bg-accent grid place-items-center" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
                      )}
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
