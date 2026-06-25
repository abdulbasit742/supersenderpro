import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, RefreshCw, Upload, CheckCircle, Clock, AlertCircle, ExternalLink, Play, Eye } from "lucide-react";
import type { WACatalogProduct, WAFlow } from "@/lib/wa-catalog.functions";

export const Route = createFileRoute("/_app/wa-catalog")({
  component: WACatalogPage,
});

type Tab = "products" | "flows";

const SYNC_COLORS = {
  synced: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  not_synced: "bg-gray-100 text-gray-500",
};

const SYNC_ICONS = {
  synced: <CheckCircle className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
  not_synced: <AlertCircle className="h-3 w-3" />,
};

const FLOW_STATUS_COLORS = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  DEPRECATED: "bg-orange-100 text-orange-700",
  BLOCKED: "bg-red-100 text-red-700",
  THROTTLED: "bg-yellow-100 text-yellow-700",
};

export default function WACatalogPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ["wa-catalog-products"],
    queryFn: async () => { const { getWACatalogProducts } = await import("@/lib/wa-catalog.functions"); return getWACatalogProducts(); },
    placeholderData: [],
    staleTime: 60_000,
  });

  const { data: flows = [], isLoading: flowLoading } = useQuery({
    queryKey: ["wa-flows"],
    queryFn: async () => { const { getWAFlows } = await import("@/lib/wa-catalog.functions"); return getWAFlows(); },
    placeholderData: [],
    staleTime: 60_000,
  });

  const syncOneMut = useMutation({
    mutationFn: async (productId: string) => { const { syncProductToMeta } = await import("@/lib/wa-catalog.functions"); return syncProductToMeta({ data: { productId } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-catalog-products"] }),
  });

  const syncAllMut = useMutation({
    mutationFn: async () => { const { syncAllProducts } = await import("@/lib/wa-catalog.functions"); return syncAllProducts({ data: {} }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-catalog-products"] }),
  });

  const publishFlowMut = useMutation({
    mutationFn: async (flowId: string) => { const { publishWAFlow } = await import("@/lib/wa-catalog.functions"); return publishWAFlow({ data: { flowId } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-flows"] }),
  });

  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const synced = products.filter((p) => p.syncStatus === "synced").length;
  const unsynced = products.filter((p) => p.syncStatus === "not_synced").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> WhatsApp Catalog & Flows</h1>
          <p className="text-muted-foreground text-sm">Sync products to Meta catalog · Manage WhatsApp Flows</p>
        </div>
        <div className="flex gap-2">
          <a href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-accent">Commerce Manager <ExternalLink className="h-3 w-3" /></a>
          {tab === "products" && <button onClick={() => syncAllMut.mutate()} disabled={syncAllMut.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"><Upload className="h-4 w-4" />{syncAllMut.isPending ? "Syncing…" : "Sync All"}</button>}
        </div>
      </div>

      {/* Stats */}
      {tab === "products" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-700">{synced}</div><div className="text-sm text-green-600">Synced to Meta</div></div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-yellow-700">{products.filter(p => p.syncStatus === "pending").length}</div><div className="text-sm text-yellow-600">Pending Sync</div></div>
          <div className="bg-gray-50 border rounded-xl p-4 text-center"><div className="text-2xl font-bold">{unsynced}</div><div className="text-sm text-muted-foreground">Not Synced</div></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["products","flows"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "products" ? "Product Catalog" : "WhatsApp Flows"}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div className="space-y-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="w-full max-w-sm px-3 py-2 border rounded-lg text-sm bg-background" />
          {prodLoading && <div className="text-center py-8 text-muted-foreground">Loading catalog…</div>}
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>{["Product","Price","Category","Sync Status","Meta ID","Action"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono">PKR {p.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${SYNC_COLORS[p.syncStatus]}`}>
                        {SYNC_ICONS[p.syncStatus]}{p.syncStatus.replace("_"," ")}
                      </span>
                    </td>
                    <td className="px-4 py-3"><code className="text-xs text-muted-foreground">{p.metaProductId ?? "—"}</code></td>
                    <td className="px-4 py-3">
                      {p.syncStatus !== "synced" ? (
                        <button onClick={() => syncOneMut.mutate(p.id)} disabled={syncOneMut.isPending} className="px-2.5 py-1 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1">
                          <Upload className="h-3 w-3" /> Sync
                        </button>
                      ) : (
                        <button onClick={() => syncOneMut.mutate(p.id)} disabled={syncOneMut.isPending} className="px-2.5 py-1 border rounded text-xs hover:bg-accent flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" /> Re-sync
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !prodLoading && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No products in catalog. Add products first in Product Catalog.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {syncAllMut.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Bulk sync completed: {(syncAllMut.data as { synced: number; failed: number } | undefined)?.synced ?? 0} synced, {(syncAllMut.data as { synced: number; failed: number } | undefined)?.failed ?? 0} failed
            </div>
          )}
        </div>
      )}

      {tab === "flows" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-1">WhatsApp Flows</h3>
            <p className="text-sm text-blue-700">Flows are interactive in-chat forms. Use them for orders, renewals, support — customers fill them out without leaving WhatsApp.</p>
          </div>
          {flowLoading && <div className="text-center py-8 text-muted-foreground">Loading flows…</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flows.map((f) => (
              <div key={f.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-semibold">{f.name}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FLOW_STATUS_COLORS[f.status]}`}>{f.status}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(f.categories ?? []).map((cat) => <span key={cat} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">{cat.replace("_"," ")}</span>)}
                </div>
                <div className="text-xs text-muted-foreground mb-3">Updated {new Date(f.updatedAt).toLocaleDateString()}</div>
                <div className="flex gap-2">
                  {f.previewUrl && (
                    <a href={f.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 border rounded text-xs hover:bg-accent"><Eye className="h-3 w-3" /> Preview</a>
                  )}
                  {f.status === "DRAFT" && (
                    <button onClick={() => publishFlowMut.mutate(f.id)} disabled={publishFlowMut.isPending} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"><Play className="h-3 w-3" /> Publish</button>
                  )}
                  <a href="https://business.facebook.com/wa/manage/flows" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 border rounded text-xs hover:bg-accent"><ExternalLink className="h-3 w-3" /> Edit</a>
                </div>
              </div>
            ))}
            {flows.length === 0 && !flowLoading && (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                <p>No flows yet. Create them in <a href="https://business.facebook.com/wa/manage/flows" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta Business Suite</a>.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
