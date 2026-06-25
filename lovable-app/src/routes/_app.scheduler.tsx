import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Section, Input, Textarea } from "@/components/ui-kit";
import { Calendar, Plus, Clock, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hook";
import { listScheduledPosts, createPost, deletePost } from "@/lib/social.functions";
import { publishPost } from "@/lib/publisher.functions";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScheduledPost } from "@/lib/types";

export const Route = createFileRoute("/_app/scheduler")({
  component: SchedulerPage,
});

interface SocialAccount { id: string; handle: string; platform: string; }

function SchedulerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("12:00");
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());

  const fnList   = useServerFn(listScheduledPosts);
  const fnCreate = useServerFn(createPost);
  const fnDelete = useServerFn(deletePost);
  const fnPub    = useServerFn(publishPost);

  const { data: posts = [], isLoading: postsLoading } = useQuery<ScheduledPost[]>({
    queryKey: ["scheduled-posts"],
    queryFn: () => fnList() as Promise<ScheduledPost[]>,
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: accounts = [] } = useQuery<SocialAccount[]>({
    queryKey: ["social-accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("social_accounts").select("id, handle, platform").eq("user_id", user.id).eq("is_active", true);
      return (data ?? []) as SocialAccount[];
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  const weekStart = useMemo(() => {
    const d = new Date();
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, []);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  }), [weekStart]);

  async function addSchedule() {
    if (!content.trim())           { toast.error("Content required"); return; }
    if (selectedTargets.size === 0) { toast.error("Select at least one platform/account"); return; }
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    const targets = Array.from(selectedTargets).map((id) => {
      const acc = accounts.find((a) => a.id === id);
      return { social_account_id: id, platform: acc!.platform };
    });
    setBusy(true);
    try {
      await fnCreate({ data: { content, targets, scheduled_at: scheduledAt } });
      toast.success("Scheduled");
      setContent(""); setSelectedTargets(new Set());
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete scheduled post?")) return;
    try {
      await fnDelete({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function publishNow(id: string) {
    try {
      await fnPub({ data: { postId: id } });
      toast.success("Published");
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const toggleTarget = (id: string) => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map: Record<string, ScheduledPost[]> = {};
    for (const d of weekDays) map[d] = [];
    for (const p of posts) {
      const d = (p.scheduled_at ?? p.created_at ?? "").slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(p);
    }
    return map;
  }, [posts, weekDays]);

  return (
    <>
      <PageHeader title="Scheduler" subtitle="Drafts aur scheduled posts calendar mein dekhein." />

      <div className="grid lg:grid-cols-3 gap-4">
        <Section title="New Schedule">
          <div className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Post content..."
              className="min-h-[80px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Target accounts</div>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggleTarget(a.id)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      selectedTargets.has(a.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border hover:bg-accent"
                    }`}
                  >
                    {a.platform}: {a.handle}
                  </button>
                ))}
                {accounts.length === 0 && (
                  <div className="text-xs text-warning">Pehle Connections page se accounts add karein.</div>
                )}
              </div>
            </div>
            <Btn variant="primary" onClick={addSchedule} disabled={busy || accounts.length === 0}>
              <Plus className="h-4 w-4" /> Schedule
            </Btn>
          </div>
        </Section>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Week view</h2>
          </div>
          <div className="grid grid-cols-7 gap-2 min-h-[220px]">
            {weekDays.map((d) => {
              const day   = new Date(d);
              const items = grouped[d] ?? [];
              return (
                <div key={d} className="rounded-lg bg-muted/40 border border-border p-2 text-xs">
                  <div className="font-medium mb-2">
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                    <div className="text-muted-foreground">{day.getDate()}</div>
                  </div>
                  {postsLoading ? (
                    <div className="h-8 bg-muted rounded animate-pulse" />
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((it) => (
                        <div key={it.id} className={`rounded px-1.5 py-1 ${it.status === "scheduled" ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning"}`}>
                          <div className="font-medium truncate">{it.content.slice(0, 30) || "(no text)"}</div>
                          <div className="flex items-center gap-1 opacity-80">
                            <Clock className="h-2.5 w-2.5" />
                            {it.scheduled_at ? new Date(it.scheduled_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "draft"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Section title="All Scheduled Items">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Content</th>
                <th className="py-2 pr-4">Platforms</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {postsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-2.5 pr-4"><div className="h-3 bg-muted rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : posts.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">Koi scheduled post nahi.</td></tr>
              ) : (
                [...posts].sort((a, b) => {
                  const t1 = a.scheduled_at ?? a.created_at ?? "";
                  const t2 = b.scheduled_at ?? b.created_at ?? "";
                  return t1.localeCompare(t2);
                }).map((p: ScheduledPost) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                      {new Date(p.scheduled_at ?? p.created_at ?? "").toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5 pr-4 max-w-[300px] truncate">{p.content || "(no text)"}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {p.post_targets?.map((t) => (
                          <span key={t.id} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{t.platform}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={p.status === "scheduled" ? "info" : p.status === "draft" ? "warning" : "muted"}>{p.status}</Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => publishNow(p.id)} className="p-1.5 rounded hover:bg-accent" title="Publish now"><Send className="h-3.5 w-3.5 text-primary" /></button>
                        <button onClick={() => remove(p.id)} className="p-1.5 rounded hover:bg-accent" title="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
