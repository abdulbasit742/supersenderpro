import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateCaption, publishPost } from "@/lib/publisher.functions";
import { toast } from "sonner";
import { Sparkles, Send, Save, Calendar, Image as ImageIcon, Video, X, Loader2, AlertTriangle, BarChart3 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/publisher")({
  component: PublisherPage,
  head: () => ({ meta: [{ title: "Composer — Social Publisher" }, { name: "description", content: "Write once, publish everywhere." }] }),
});

interface SocialAccount { id: string; platform: string; handle: string; is_active: boolean; }

const LIMITS: Record<string, number> = {
  twitter: 280, x: 280, threads: 500,
  tiktok: 2200, instagram: 2200,
  facebook: 63206, linkedin: 3000,
  whatsapp: 4096, telegram: 4096,
};

function PublisherPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [media, setMedia] = useState<{ url: string; type: "image" | "video"; path: string }[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasAutoSelected = useRef(false);

  const genFn = useServerFn(generateCaption);
  const pubFn = useServerFn(publishPost);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const { data: accounts = [] } = useQuery<SocialAccount[]>({
    queryKey: ["social-accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("social_accounts").select("*").eq("user_id", user.id).eq("is_active", true);
      return (data ?? []) as SocialAccount[];
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!hasAutoSelected.current && accounts.length > 0) {
      setSelected(new Set(accounts.map((a) => a.id)));
      hasAutoSelected.current = true;
    }
  }, [accounts]);

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function uploadMedia(file: File) {
    if (!user) return;
    const type: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase.storage.from("post-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (data?.signedUrl) setMedia((m) => [...m, { url: data.signedUrl, type, path }]);
  }

  async function aiGenerate() {
    if (!topic.trim()) { toast.error("Pehle topic likhein"); return; }
    if (selected.size === 0) { toast.error("Ek platform select karein"); return; }
    setAiBusy(true);
    try {
      const sel = accounts.filter((a) => selected.has(a.id)).map((a) => a.platform);
      const uniq = [...new Set(sel)];
      const r = await genFn({ data: { topic, platforms: uniq as string[] } }) as { caption: string; hashtags: string[] };
      setText(`${r.caption}\n\n${r.hashtags.join(" ")}`);
      toast.success("Caption generated!");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setAiBusy(false); }
  }

  async function save(status: "draft" | "scheduled" | "publish_now") {
    if (!user) return;
    if (status !== "draft" && !text.trim() && media.length === 0) { toast.error("Content khaali hai"); return; }
    if (status !== "draft" && selected.size === 0) { toast.error("Platform select karein"); return; }
    if (status === "scheduled" && !scheduleAt) { toast.error("Schedule time dein"); return; }

    setSendBusy(true);
    try {
      const dbStatus = status === "publish_now" ? "publishing" : status === "scheduled" ? "scheduled" : "draft";
      const { data: post, error } = await supabase.from("posts").insert({
        user_id: user.id, content: text,
        media_urls: media.map((m) => m.url),
        media_type: media[0]?.type ?? null,
        status: dbStatus,
        scheduled_at: status === "scheduled" ? new Date(scheduleAt).toISOString() : null,
      }).select().single();
      if (error) throw error;

      if (status !== "draft") {
        const targets = accounts.filter((a) => selected.has(a.id)).map((a) => ({
          post_id: post.id, social_account_id: a.id, platform: a.platform, status: "pending" as const,
        }));
        const { error: tErr } = await supabase.from("post_targets").insert(targets);
        if (tErr) throw tErr;
      }

      if (status === "publish_now") {
        const r = await pubFn({ data: { postId: post.id } }) as { status: string; results: { ok: boolean; error?: string }[] };
        const ok = r.results.filter((x) => x.ok).length;
        if (r.status === "published") toast.success(`Published to ${ok}/${r.results.length}`);
        else if (r.status === "partial") toast.warning(`Partial: ${ok}/${r.results.length} succeeded`);
        else toast.error(`Failed: ${r.results.map((x) => x.ok ? "" : x.error).filter(Boolean).join("; ")}`);
      } else {
        toast.success(status === "scheduled" ? "Scheduled!" : "Draft saved");
      }

      setText(""); setMedia([]); setTopic(""); setScheduleAt("");
      qc.invalidateQueries({ queryKey: ["publisher-posts"] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSendBusy(false); }
  }

  const selectedPlatforms = useMemo(() => {
    const set = new Set<string>();
    accounts.filter((a) => selected.has(a.id)).forEach((a) => set.add(a.platform));
    return [...set];
  }, [accounts, selected]);

  const warnings = useMemo(() => {
    return selectedPlatforms
      .map((p) => ({ p, limit: LIMITS[p] ?? 0 }))
      .filter((x) => x.limit > 0 && text.length > x.limit)
      .map((x) => `${x.p} limit ${x.limit} chars (currently ${text.length})`);
  }, [selectedPlatforms, text]);

  return (
    <div>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Composer</h1>
          <p className="text-sm text-muted-foreground">Aik post → multiple platforms. AI caption + schedule support.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link to="/publisher-analytics" className="text-primary hover:underline inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Analytics</Link>
          <Link to="/connections" className="text-primary hover:underline">Manage connections →</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">AI Topic / Idea</label>
            <div className="flex gap-2 mt-1">
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. New iPhone launch deal" className="flex-1 h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
              <button onClick={aiGenerate} disabled={aiBusy} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60">
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Post text</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Type your post or use AI…" className="mt-1 w-full p-3 rounded-md bg-secondary border border-border text-sm resize-y" />
            <div className="flex items-center justify-between mt-1 gap-2">
              <div className="flex flex-wrap gap-1">
                {selectedPlatforms.map((p) => {
                  const limit = LIMITS[p] ?? 0;
                  if (!limit) return null;
                  const over = text.length > limit;
                  const pct = Math.min(100, Math.round((text.length / limit) * 100));
                  return (
                    <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${over ? "bg-destructive/15 text-destructive" : pct > 80 ? "bg-yellow-500/15 text-yellow-600" : "bg-secondary text-muted-foreground"}`}>
                      {p} {text.length}/{limit}
                    </span>
                  );
                })}
              </div>
              <div className="text-[11px] text-muted-foreground whitespace-nowrap">{text.length} chars</div>
            </div>
            {warnings.length > 0 && (
              <div className="mt-2 flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>Over limit on: {warnings.join(", ")}</div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Media</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative h-20 w-20 rounded-md overflow-hidden bg-muted border border-border">
                  {m.type === "image" ? <img src={m.url} className="h-full w-full object-cover" alt="" /> : <div className="h-full w-full grid place-items-center"><Video className="h-6 w-6" /></div>}
                  <button onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 h-5 w-5 grid place-items-center bg-black/70 rounded-full text-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} className="h-20 w-20 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex flex-col items-center justify-center gap-1 text-xs">
                <ImageIcon className="h-4 w-4" /> Add
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f); e.target.value = ""; }} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Schedule (optional)</label>
            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="mt-1 h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => save("draft")} disabled={sendBusy} className="h-10 px-4 rounded-md bg-secondary text-sm font-medium inline-flex items-center gap-2 hover:bg-accent"><Save className="h-4 w-4" /> Draft</button>
            <button onClick={() => save("scheduled")} disabled={sendBusy || !scheduleAt} className="h-10 px-4 rounded-md bg-secondary text-sm font-medium inline-flex items-center gap-2 hover:bg-accent"><Calendar className="h-4 w-4" /> Schedule</button>
            <button onClick={() => save("publish_now")} disabled={sendBusy} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 ml-auto">
              {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish Now
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Target channels</h3>
          {accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No channels connected. <Link to="/connections" className="text-primary hover:underline">Connect one</Link>.
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <label key={a.id} className="flex items-center gap-3 p-2 rounded-md bg-secondary hover:bg-accent cursor-pointer">
                  <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 accent-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium capitalize">{a.platform}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{a.handle}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
