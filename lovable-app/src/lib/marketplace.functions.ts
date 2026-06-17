import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMarketplaceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: accounts }, { data: listings }] = await Promise.all([
      supabase.from("ecommerce_accounts").select("*").eq("user_id", userId),
      supabase.from("marketplace_listings").select("*").eq("user_id", userId),
    ]);
    return {
      accounts: accounts ?? [],
      listings: listings ?? [],
      totalPublished: (listings ?? []).filter(l => l.status === "published").length,
      totalDraft: (listings ?? []).filter(l => l.status === "draft").length,
      totalPaused: (listings ?? []).filter(l => l.status === "paused").length,
      totalError: (listings ?? []).filter(l => l.status === "error").length,
    };
  });

export const syncToMarketplace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { listingId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: listing } = await supabase.from("marketplace_listings")
      .select("*").eq("id", data.listingId).eq("user_id", userId).single();

    if (!listing) throw new Error("Listing not found");

    const { data: account } = await supabase.from("ecommerce_accounts")
      .select("*").eq("user_id", userId).eq("platform", listing.platform).eq("is_active", true).maybeSingle();

    if (!account) throw new Error("Active account not found for this platform");

    // Demo: simulate API call to marketplace
    await new Promise(r => setTimeout(r, 600));

    const { error } = await supabase.from("marketplace_listings").update({
      status: "published",
      listing_id: `DEMO-${Date.now()}`,
      listing_url: `https://demo-marketplace.example.com/listing/${Date.now()}`,
      last_synced_at: new Date().toISOString(),
    }).eq("id", data.listingId);

    if (error) throw error;
    return { success: true, message: "Published to marketplace (demo)" };
  });
