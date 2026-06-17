import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge } from "@/components/ui-kit";
import { orders } from "@/lib/mock";
import { Check, X, Truck, RotateCcw, Eye, Image, ShoppingBag, Globe, Store, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const [tab, setTab] = useState<"local" | "marketplace">("local");
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    if (!user || tab !== "marketplace") return;
    supabase.from("marketplace_listings").select("*").eq("user_id", user.id).eq("status", "published").then(({ data }) => {
      setListings(data ?? []);
    });
  }, [user, tab]);

  return (
    <>
      <PageHeader title="Orders" subtitle="Approve, deliver, refund — local aur marketplace orders ek jagah." />

      <div className="flex gap-2 mb-4">
        {([
          { id: "local", label: "Local Orders", icon: ShoppingBag },
          { id: "marketplace", label: "Marketplace Orders", icon: Globe },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-9 px-3 rounded-md text-sm border border-border flex items-center gap-2",
              tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-accent"
            )}
          >
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "local" ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {["Order ID","Customer","Product","Type","Price","Status","Payment","Screenshot","Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                    <td className="px-4 py-3">{o.customer}</td>
                    <td className="px-4 py-3">{o.product}</td>
                    <td className="px-4 py-3"><Badge variant="info">{o.type}</Badge></td>
                    <td className="px-4 py-3">PKR {o.pricePkr.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={o.status === "delivered" ? "success" : o.status === "pending" ? "warning" : o.status === "refunded" ? "destructive" : "info"}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={o.paymentStatus === "paid" ? "success" : o.paymentStatus === "refunded" ? "destructive" : "warning"}>{o.paymentStatus}</Badge>
                    </td>
                    <td className="px-4 py-3">{o.screenshot ? <Image className="h-4 w-4 text-info" /> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Btn variant="ghost" title="Approve"><Check className="h-3.5 w-3.5" /></Btn>
                        <Btn variant="ghost" title="Reject"><X className="h-3.5 w-3.5" /></Btn>
                        <Btn variant="ghost" title="Deliver"><Truck className="h-3.5 w-3.5" /></Btn>
                        <Btn variant="ghost" title="Refund"><RotateCcw className="h-3.5 w-3.5" /></Btn>
                        <Btn variant="ghost" title="View"><Eye className="h-3.5 w-3.5" /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {["Product","Platform","Listing ID","Status","Last Synced","Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Koi marketplace orders/listings nahi hain. Pehle products publish karein.</td></tr>
                ) : (
                  listings.map((l) => (
                    <tr key={l.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3">{l.product_id}</td>
                      <td className="px-4 py-3 capitalize"><Badge variant="info">{l.platform}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs">{l.listing_id ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant={l.status === "published" ? "success" : "warning"}>{l.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.last_synced_at ? new Date(l.last_synced_at).toLocaleDateString() : "Never"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {l.listing_url && <Btn variant="ghost" title="Open"><Eye className="h-3.5 w-3.5" /></Btn>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
