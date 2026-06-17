import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Posts stats
    const { data: posts } = await supabase
      .from("posts")
      .select("status, created_at, scheduled_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    // Post targets stats — join through posts to filter by user
    const { data: targets } = await supabase
      .from("post_targets")
      .select("platform, status, post_id, created_at, posts!inner(user_id)")
      .eq("posts.user_id", userId)
      .limit(500);

    // Channel items stats
    const { data: channelItems } = await supabase
      .from("channel_items")
      .select("status, fetched_at")
      .eq("user_id", userId)
      .order("fetched_at", { ascending: false })
      .limit(200);

    const p = posts ?? [];
    const t = targets ?? [];
    const c = channelItems ?? [];

    const totalPosts = p.length;
    const publishedPosts = p.filter((x) => x.status === "published").length;
    const scheduledPosts = p.filter((x) => x.status === "scheduled").length;
    const draftPosts = p.filter((x) => x.status === "draft").length;
    const failedPosts = p.filter((x) => x.status === "failed").length;

    // Platform breakdown from targets
    const platformMap: Record<string, { total: number; published: number; failed: number }> = {};
    for (const item of t) {
      const pl = item.platform;
      if (!platformMap[pl]) platformMap[pl] = { total: 0, published: 0, failed: 0 };
      platformMap[pl].total++;
      if (item.status === "published") platformMap[pl].published++;
      if (item.status === "failed") platformMap[pl].failed++;
    }
    const platformBreakdown = Object.entries(platformMap).map(([name, v]) => ({ name, ...v }));

    // Daily post counts (last 14 days)
    const dailyMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const item of p) {
      const d = item.created_at.slice(0, 10);
      if (dailyMap[d] !== undefined) dailyMap[d]++;
    }
    const dailyPosts = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    // Channel activity (fetched vs published)
    const channelMap: Record<string, { fetched: number; published: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      channelMap[d.toISOString().slice(0, 10)] = { fetched: 0, published: 0 };
    }
    for (const item of c) {
      const d = item.fetched_at.slice(0, 10);
      if (channelMap[d]) channelMap[d].fetched++;
      if (channelMap[d] && item.status === "published") channelMap[d].published++;
    }
    const channelActivity = Object.entries(channelMap).map(([date, v]) => ({ date, ...v }));

    // Target status breakdown
    const targetStatusCounts: Record<string, number> = {};
    for (const item of t) {
      targetStatusCounts[item.status] = (targetStatusCounts[item.status] ?? 0) + 1;
    }
    const targetStatus = Object.entries(targetStatusCounts).map(([status, count]) => ({ status, count }));

    return {
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts,
      failedPosts,
      platformBreakdown,
      dailyPosts,
      channelActivity,
      targetStatus,
    };
  });
