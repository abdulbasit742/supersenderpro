import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Textarea, Section } from "@/components/ui-kit";
import { Send, Trash2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hook";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPost, deletePost, listPosts } from "@/lib/social.functions";
import { publishPost } from "@/lib/publisher.functions";
import type { ScheduledPost } from "@/lib/types";

export const Route = createFileRoute("/_app/broadcast")({
  component: BroadcastPage,
});

interface SocialAccount { id: string; handle: string; platform: string; }

function BroadcastPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [sending, setSending] = useState(false);

  const fnCreate = useServerFn(createPost);
  const fnDelete = useServerFn(deletePost);
  const fnList   = useServerFn(listPosts);
  const fnPub    = useServerFn(publishPost);

  const { data: history = [], isLoading: historyLoading } = useQuery<ScheduledPost[]>({
    queryKey: ["broadcast-history"],
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

  async function sendNow() {
    if (!content.trim())      { toast.error("Message content required"); return; }
    if (selected.size === 0)  { toast.error("Select at least one target account"); return; }
    const targets = Array.from(selected).map((id) => {
      const acc = accounts.find((a) => a.id === id);
      return { social_account_id: id, platform: acc!.platform };
    });
    const scheduledAt = scheduleDate && scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : null;
    setSending(true);
    try {
      const post = await fnCreate({ data: { content, targets, scheduled_at: scheduledAt } }) as ScheduledPost;
      if (!scheduledAt) {
        await fnPub({ data: { postId: post.id } });
        toast.success("Broadcast sent!");
      } else {
        toast.success("Broadcast scheduled");
      }
      setContent(""); setSelected(new Set()); setScheduleDate(""); setScheduleTime("");
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function retry(id: string) {
    try {
      await fnPub({ data: { postId: id } });
      toast.success("Retried");
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await fnDelete({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isScheduled = !!(scheduleDate && scheduleTime);

  return (
    <>
      <PageHeader title="Broadcast" subtitle="One-off messages to connected accounts and channels." />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <Section title="Composer">
            <div className="space-y-3">
              <Textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your broadcast message..."
              />
              <div className="text-xs text-muted-foreground">Target accounts</div>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selected.has(a.id)
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
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-9 px-3 rounded-md bg-secondary border border-border text-sm"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="h-9 px-3 rounded-md bg-secondary border border-border text-sm"
                />
              </div>
              {isScheduled && <div className="text-xs text-info">This will be scheduled, not sent immediately.</div>}
              <div className="flex gap-2">
                <Btn variant="primary" onClick={sendNow} disabled={sending || accounts.length === 0}>
                  <Send className="h-4 w-4" /> {isScheduled ? "Schedule" : "Send Now"}
                </Btn>
              </div>
            </div>
          </Section>
        </div>

        <Section title="Variables">
          <div className="flex flex-wrap gap-2 mb-3">
            {["{{name}}","{{price}}","{{date}}"].map((v) => (
              <button
                key={v}
                onClick={() => setContent((prev) => prev + " " + v)}
                className="text-xs bg-muted hover:bg-accent rounded px-2 py-1 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Variables abhi placeholder hain — actual substitution future mein aayega.
          </p>
        </Section>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold">History</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Date","Content","Platforms","Status","Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-muted rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Abhi koi broadcast nahi.</td></tr>
              ) : (
                history.map((h: ScheduledPost) => (
                  <tr key={h.id} className="border-t border-border hover:bg-accent/20">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(h.created_at ?? "").toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 max-w-[300px] truncate">{h.content || "(no text)"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {h.post_targets?.map((t) => (
                          <span key={t.id} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{t.platform}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        h.status === "published" ? "success" :
                        h.status === "scheduled" ? "info"    :
                        h.status === "failed"    ? "destructive" :
                        h.status === "partial"   ? "warning"    : "muted"
                      }>
                        {h.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(h.status === "failed" || h.status === "partial" || h.status === "draft") && (
                          <button onClick={() => retry(h.id)} className="p-1.5 rounded hover:bg-accent" title="Retry">
                            <RotateCw className="h-3.5 w-3.5 text-primary" />
                          </button>
                        )}
                        <button onClick={() => remove(h.id)} className="p-1.5 rounded hover:bg-accent" title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
