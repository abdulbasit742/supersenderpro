import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { publishPost } from "@/lib/publisher.functions";
import { toast } from "sonner";
import { RotateCw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/publisher-posts")({
  component: PostsPage,
  head: () => ({ meta: [{ title: "Posts — Social Publisher" }, { name: "description", content: "Your post history and publish results." }] }),
});

const colors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-warning/15 text-warning",
  publishing: "bg-primary/15 text-primary",
  published: "bg-success/15 text-success",
  partial: "bg-warning/15 text-warning",
  failed: "bg-destructive/15 text-destructive",
};

function PostsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const pubFn = useServerFn(publishPost);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("posts")
      .select("*, post_targets(*)")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setPosts(data ?? []);
  }

  useEffect(() => { load(); }, [user]);

  async function retry(id: string) {
    try { const r = await pubFn({ data: { postId: id } }); toast.success(`Retry: ${r.status}`); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function del(id: string) {
    if (!confirm("Delete post?")) return;
    await supabase.from("posts").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Posts</h1>
      <p className="text-sm text-muted-foreground mb-6">Apke recent posts aur per-platform publish results.</p>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Abhi koi post nahi. Composer se shuru karein.</div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm line-clamp-3 whitespace-pre-wrap">{p.content || <em className="text-muted-foreground">(no text)</em>}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(p.created_at).toLocaleString()} • {p.media_urls?.length ?? 0} media
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[p.status] ?? "bg-muted"}`}>{p.status}</span>
              </div>
              {p.post_targets?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.post_targets.map((t: any) => (
                    <span key={t.id} title={t.error_message ?? ""} className={`text-[10px] px-2 py-0.5 rounded-full ${colors[t.status] ?? "bg-muted"}`}>
                      {t.platform}: {t.status}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                {(p.status === "failed" || p.status === "partial") && (
                  <button onClick={() => retry(p.id)} className="text-xs h-7 px-3 rounded bg-secondary hover:bg-accent inline-flex items-center gap-1"><RotateCw className="h-3 w-3" /> Retry</button>
                )}
                <button onClick={() => del(p.id)} className="text-xs h-7 px-3 rounded bg-secondary hover:bg-accent text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
