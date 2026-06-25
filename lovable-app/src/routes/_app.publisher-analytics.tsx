import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { CheckCircle2, XCircle, Clock, Send, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui-kit";

export const Route = createFileRoute("/_app/publisher-analytics")({
  component: PublisherAnalyticsPage,
  head: () => ({ meta: [{ title: "Publisher Analytics" }, { name: "description", content: "Posting performance across all your social channels." }] }),
});

const COLORS = ["var(--primary)", "var(--info)", "var(--warning)", "var(--chart-4)", "var(--chart-5)", "var(--destructive)"];
const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
  tiktok: "TikTok", whatsapp: "WhatsApp", telegram: "Telegram",
};

interface PostTarget { id: string; platform: string; status: string; error_message?: string; posts?: { content?: string; created_at?: string }; attempted_at?: string; }
interface AnalyticsData { posts: { created_at: string; status: string }[]; targets: PostTarget[]; }

function PublisherAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["publisher-analytics", user?.id],
    queryFn: async () => {
      if (!user) return { posts: [], targets: [] };
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [p, t] = await Promise.all([
        supabase.from("posts").select("created_at, status").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("post_targets").select("*, posts!inner(user_id, content, created_at)").eq("posts.user_id", user.id).gte("posts.created_at", since),
      ]);
      return { posts: p.data ?? [], targets: t.data ?? [] };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const posts   = data?.posts ?? [];
  const targets = data?.targets ?? [];

  const stats = useMemo(() => {
    const published = targets.filter((t) => t.status === "published").length;
    const failed    = targets.filter((t) => t.status === "failed").length;
    const pending   = targets.filter((t) => ["pending","publishing"].includes(t.status)).length;
    const scheduled = posts.filter((p) => p.status === "scheduled").length;
    return { published, failed, pending, scheduled, total: targets.length };
  }, [posts, targets]);

  const byPlatform = useMemo(() => {
    const map = new Map<string, { platform: string; published: number; failed: number; total: number }>();
    for (const t of targets) {
      const cur = map.get(t.platform) ?? { platform: PLATFORM_LABEL[t.platform] ?? t.platform, published: 0, failed: 0, total: 0 };
      cur.total++;
      if (t.status === "published") cur.published++;
      if (t.status === "failed")    cur.failed++;
      map.set(t.platform, cur);
    }
    return [...map.values()];
  }, [targets]);

  const byDay = useMemo(() => {
    const buckets: Record<string, { d: string; posts: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const k = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(5, 10);
      buckets[k] = { d: k, posts: 0 };
    }
    for (const p of posts) {
      const k = (p.created_at as string).slice(5, 10);
      if (buckets[k]) buckets[k].posts++;
    }
    return Object.values(buckets);
  }, [posts]);

  const recent       = targets.slice(0, 15);
  const successRate  = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;

  if (!authLoading && !user) {
    return <div className="p-8"><Link to="/auth" className="text-primary hover:underline">Sign in</Link></div>;
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Publisher Analytics</h1>
          <p className="text-sm text-muted-foreground">Last 30 days · sab platforms ka performance.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/publisher" className="text-sm px-3 h-9 inline-flex items-center rounded-md bg-secondary hover:bg-accent">New post</Link>
          <Link to="/publisher-posts" className="text-sm px-3 h-9 inline-flex items-center rounded-md bg-secondary hover:bg-accent">All posts</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3">
              <Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-12" />
            </div>
          ))
        ) : (
          <>
            <Kpi icon={<Send className="h-4 w-4" />}         label="Total sends"   value={stats.total}       tone="default" />
            <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Published"     value={stats.published}   tone="success" />
            <Kpi icon={<XCircle className="h-4 w-4" />}      label="Failed"        value={stats.failed}      tone="danger"  />
            <Kpi icon={<Clock className="h-4 w-4" />}        label="Scheduled"     value={stats.scheduled}   tone="warning" />
            <Kpi icon={<TrendingUp className="h-4 w-4" />}   label="Success rate"  value={`${successRate}%`} tone={successRate >= 80 ? "success" : successRate >= 50 ? "warning" : "danger"} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <AnalyticsCard title="Posts per day (14d)">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={byDay}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="posts" fill="var(--color-primary)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Sends per platform">
          {isLoading ? <Skeleton className="h-64 w-full" /> : byPlatform.length === 0 ? (
            <div className="h-64 grid place-items-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPlatform} dataKey="total" nameKey="platform" innerRadius={50} outerRadius={90}>
                    {byPlatform.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsCard>
      </div>

      <AnalyticsCard title="Per-platform breakdown">
        {byPlatform.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6">Abhi tak koi post nahi bheji. <Link to="/publisher" className="text-primary hover:underline">Start composing</Link>.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2">Platform</th><th>Total</th><th>Published</th><th>Failed</th><th>Success</th>
                </tr>
              </thead>
              <tbody>
                {byPlatform.map((r) => {
                  const rate = r.total > 0 ? Math.round((r.published / r.total) * 100) : 0;
                  return (
                    <tr key={r.platform} className="border-b border-border/50 last:border-0">
                      <td className="py-2 font-medium">{r.platform}</td>
                      <td className="py-2">{r.total}</td>
                      <td className="py-2 text-success">{r.published}</td>
                      <td className="py-2 text-destructive">{r.failed}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-32">
                            <div className="h-full bg-primary" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AnalyticsCard>

      <div className="mt-4">
        <AnalyticsCard title="Recent activity">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-md" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No recent activity</div>
          ) : (
            <div className="space-y-2">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-md bg-secondary/50 text-sm">
                  <StatusDot status={t.status} />
                  <span className="capitalize w-20 text-xs text-muted-foreground">{PLATFORM_LABEL[t.platform] ?? t.platform}</span>
                  <span className="flex-1 truncate">{t.posts?.content ?? "—"}</span>
                  {t.error_message && <span className="text-xs text-destructive truncate max-w-48" title={t.error_message}>{t.error_message}</span>}
                  <span className="text-xs text-muted-foreground">{new Date(t.posts?.created_at ?? t.attempted_at ?? Date.now()).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: "default" | "success" | "danger" | "warning" }) {
  const colorClass = tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}

function AnalyticsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold mb-3 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-success", failed: "bg-destructive",
    pending: "bg-muted-foreground", publishing: "bg-warning animate-pulse",
  };
  return <span className={`h-2 w-2 rounded-full ${map[status] ?? "bg-muted-foreground"}`} title={status} />;
}
