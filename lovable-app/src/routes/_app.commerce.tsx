import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, KpiCard, Skeleton } from "@/components/ui-kit";
import { ShoppingBag, TrendingUp, Wallet, Repeat, Store, Globe, Package, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import type { EcommerceAccount, MarketplaceListing } from "@/lib/types";

export const Route = createFileRoute("/_app/commerce")({
  component: CommercePage,
});

function CommercePage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{ accounts: EcommerceAccount[]; listings: MarketplaceListing[] }>({
    queryKey: ["commerce", user?.id],
    queryFn: async () => {
      if (!user) return { accounts: [], listings: [] };
      const [{ data: a }, { data: l }] = await Promise.all([
        supabase.from("ecommerce_accounts").select("*").eq("user_id", user.id),
        supabase.from("marketplace_listings").select("*").eq("user_id", user.id),
      ]);
      return { accounts: (a ?? []) as EcommerceAccount[], listings: (l ?? []) as MarketplaceListing[] };
    },
    enabled: !!user,
    staleTime: 60_000,
    placeholderData: { accounts: [], listings: [] },
  });

  const ecomAccounts = data?.accounts ?? [];
  const listings     = data?.listings ?? [];

  const publishedCount = listings.filter((l) => l.status === "published").length;
  const draftCount     = listings.filter((l) => l.status === "draft").length;
  const errorCount     = listings.filter((l) => l.status === "error").length;

  return (
    <>
      <PageHeader title="Commerce" subtitle="Store-wide health, conversion aur catalog stats." />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 8 }).map((_, i) => <Card key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-7 w-16" /></Card>)}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KpiCard label="GMV (30d)"    value="PKR 1.24M" icon={Wallet}   accent="success" />
            <KpiCard label="Conversion"   value="6.8%"      icon={TrendingUp} accent="primary" />
            <KpiCard label="Avg Order"    value="PKR 3,420" icon={ShoppingBag} accent="info" />
            <KpiCard label="Repeat Rate"  value="32%"       icon={Repeat}   accent="warning" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KpiCard label="Live Listings"    value={String(publishedCount)}     icon={Store}       accent="success" />
            <KpiCard label="Draft Listings"   value={String(draftCount)}         icon={Package}     accent="info" />
            <KpiCard label="Connected Shops"  value={String(ecomAccounts.length)} icon={Globe}      accent="primary" />
            <KpiCard label="Sync Errors"      value={String(errorCount)}         icon={AlertCircle} accent={errorCount > 0 ? "destructive" : "success"} />
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold mb-3">Catalog Health</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between p-2 rounded bg-muted"><span>Active products</span><Badge variant="success">86</Badge></li>
            <li className="flex justify-between p-2 rounded bg-muted"><span>Out of stock</span><Badge variant="destructive">4</Badge></li>
            <li className="flex justify-between p-2 rounded bg-muted"><span>Low stock</span><Badge variant="warning">9</Badge></li>
            <li className="flex justify-between p-2 rounded bg-muted"><span>Without image</span><Badge variant="info">11</Badge></li>
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold mb-3">Connected Marketplaces</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
            </div>
          ) : ecomAccounts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Koi marketplace connect nahi hai. <a href="/connections" className="text-primary underline">Connections</a> page pe setup karein.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {ecomAccounts.map((a: EcommerceAccount) => (
                <li key={a.id} className="flex justify-between p-2 rounded bg-muted items-center">
                  <span className="capitalize font-medium">{a.platform}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{a.shop_name || a.shop_id}</span>
                    <Badge variant={a.is_active ? "success" : "destructive"}>{a.is_active ? "Active" : "Paused"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-semibold mb-3">Platform Distribution</h2>
        <div className="flex flex-wrap gap-3">
          {["daraz","etsy","amazon","shopify"].map((p) => {
            const count     = listings.filter((l) => l.platform === p).length;
            const published = listings.filter((l) => l.platform === p && l.status === "published").length;
            return (
              <div key={p} className="flex-1 min-w-[140px] bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground capitalize">{p}</div>
                <div className="text-lg font-bold">
                  {count} <span className="text-xs font-normal text-success">{published} live</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
