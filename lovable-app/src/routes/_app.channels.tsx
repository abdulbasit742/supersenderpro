import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Toggle, Input, Section } from "@/components/ui-kit";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hook";
import {
  listChannelSources, saveChannelSource, deleteChannelSource,
  listChannelItems, pullChannelUpdates, broadcastChannelItem, deleteChannelItem,
  rewriteChannelItem,
} from "@/lib/channels.functions";
import { toast } from "sonner";
import { Plus, RefreshCw, Send, Trash2, ShieldCheck, Zap, Sparkles, Pencil } from "lucide-react";

export const Route = createFileRoute("/_app/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const { user } = useAuth();
  const [sources, setSources] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", identifier: "", bot_account_id: "", auto_publish: false, ai_rewrite: false });
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const fnSources = useServerFn(listChannelSources);
  const fnItems = useServerFn(listChannelItems);
  const fnSave = useServerFn(saveChannelSource);
  const fnDel = useServerFn(deleteChannelSource);
  const fnPull = useServerFn(pullChannelUpdates);
  const fnCast = useServerFn(broadcastChannelItem);
  const fnDelItem = useServerFn(deleteChannelItem);
  const fnRewrite = useServerFn(rewriteChannelItem);

  async function refresh() {
    try {
      const [s, i] = await Promise.all([fnSources(), fnItems()]);
      setSources(s); setItems(i);
    } catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => {
    if (!user) return;
    refresh();
    supabase.from("social_accounts").select("id, handle, platform").eq("user_id", user.id).eq("platform", "telegram")
      .then(({ data }) => setBots(data ?? []));
  }, [user]);

  async function addSource() {
    if (!form.name || !form.identifier) { toast.error("Name aur channel @username required"); return; }
    try {
      await fnSave({ data: { ...form, bot_account_id: form.bot_account_id || null } });
      setAdding(false);
      setForm({ name: "", identifier: "", bot_account_id: "", auto_publish: false, ai_rewrite: false });
      toast.success("Source added");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  async function pullAll() {
    setLoading(true);
    let total = 0;
    for (const s of sources.filter(x => x.is_active)) {
      try { const r = await fnPull({ data: { sourceId: s.id } }); total += r.inserted; }
      catch (e: any) { toast.error(`${s.name}: ${e.message}`); }
    }
    setLoading(false);
    toast.success(`${total} new posts fetched`);
    refresh();
  }

  async function broadcast(id: string, editedContent?: string) {
    try {
      await fnCast({ data: { itemId: id, editedContent } });
      toast.success("Broadcasted to all platforms");
      setEditing(null);
      refresh();
    }
    catch (e: any) { toast.error(e.message); }
  }

  async function rewriteWithAI(id: string, tone?: string) {
    setAiLoading(id);
    try {
      const r = await fnRewrite({ data: { itemId: id, tone } });
      toast.success("AI rewrite done");
      setEditText(r.aiContent);
      refresh();
    } catch (e: any) { toast.error(e.message); }
    setAiLoading(null);
  }

  async function toggleSource(s: any, v: boolean) {
    await fnSave({ data: { id: s.id, name: s.name, identifier: s.identifier, bot_account_id: s.bot_account_id, is_active: v } });
    refresh();
  }

  const queued = items.filter(i => i.status === "queued");
  const done = items.filter(i => i.status !== "queued");

  return (
    <>
      <PageHeader
        title="Channel Automation"
        subtitle="Source channels se posts copy karke apne saare connected platforms par broadcast karein."
        actions={
          <>
            <Btn variant="primary" onClick={pullAll} disabled={loading || sources.length === 0}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Fetch New
            </Btn>
            <Btn onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Source</Btn>
          </>
        }
      />

      <div className="rounded-lg border border-warning/40 bg-warning/10 text-warning text-sm p-3 mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Telegram source ke liye apka bot us channel ka admin hona zaroori hai. Bot token Connections → Telegram se add karein.
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Section title={`Source Channels (${sources.length})`}>
          {sources.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Koi source nahi. "Add Source" se shuru karein.</div>
          ) : (
            <div className="space-y-2">
              {sources.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name} <span className="text-xs text-muted-foreground">@{String(s.identifier).replace(/^@/, "")}</span></div>
                    <div className="text-xs text-muted-foreground truncate">
                      Bot: {s.social_accounts?.handle ?? "—"} · {s.auto_publish ? "auto" : "manual"}{s.ai_rewrite ? " · AI" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle checked={s.is_active} onChange={(v) => toggleSource(s, v)} />
                    <button onClick={async () => { if (confirm("Delete source?")) { await fnDel({ data: { id: s.id } }); refresh(); } }}
                      className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="How it works">
          <ol className="text-sm space-y-2 list-decimal pl-4">
            <li>Connections page se Telegram bot token add karein.</li>
            <li>Apne bot ko source Telegram channel ka admin banayein.</li>
            <li>Yahan "Add Source" → channel ka @username daalein.</li>
            <li>"Fetch New" dabayein — nayi posts queue mein ajayengi.</li>
            <li>Queue item par "Broadcast" — sab connected platforms (FB/IG/LinkedIn/TikTok/WA) par jayegi.</li>
            <li><Sparkles className="h-3 w-3 inline" /> "AI Rewrite" — content ko AI se improve karke publish.</li>
          </ol>
        </Section>
      </div>

      <Section title={`Queue (${queued.length})`}>
        {queued.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Queue khali. "Fetch New" dabayein.</div>
        ) : (
          <div className="space-y-2">
            {queued.map(it => (
              <div key={it.id} className="p-3 rounded bg-muted">
                <div className="text-xs text-muted-foreground mb-1">{it.channel_sources?.name} · {new Date(it.fetched_at).toLocaleString()}</div>

                {editing === it.id ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Original:</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 bg-background/50 p-2 rounded">{it.content}</div>
                    <div className="text-xs text-primary font-medium flex items-center gap-1"><Sparkles className="h-3 w-3" /> Content to broadcast:</div>
                    <textarea
                      className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Btn variant="primary" onClick={() => broadcast(it.id, editText)}><Send className="h-3 w-3" /> Broadcast</Btn>
                      <Btn onClick={() => rewriteWithAI(it.id)} disabled={!!aiLoading}>
                        <Sparkles className={`h-3 w-3 ${aiLoading === it.id ? "animate-spin" : ""}`} /> AI Rewrite
                      </Btn>
                      <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap line-clamp-4">{it.ai_content || it.content || <em>(no text)</em>}</div>
                    {it.ai_content && (
                      <div className="text-xs text-primary mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI rewritten</div>
                    )}
                    {it.media_urls?.length > 0 && (
                      <div className="text-xs mt-1 text-muted-foreground">📎 {it.media_type} ({it.media_urls.length})</div>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Btn variant="primary" onClick={() => broadcast(it.id, it.ai_content || undefined)}><Send className="h-3 w-3" /> Broadcast All</Btn>
                      <Btn onClick={() => { setEditing(it.id); setEditText(it.ai_content || it.content || ""); }}><Pencil className="h-3 w-3" /> Edit</Btn>
                      <Btn onClick={() => rewriteWithAI(it.id)} disabled={!!aiLoading}>
                        <Sparkles className={`h-3 w-3 ${aiLoading === it.id ? "animate-spin" : ""}`} /> AI Rewrite
                      </Btn>
                      <Btn onClick={async () => { await fnDelItem({ data: { id: it.id } }); refresh(); }}><Trash2 className="h-3 w-3" /></Btn>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="mt-4">
        <Section title={`Recent Broadcasts (${done.length})`}>
          {done.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Abhi koi broadcast nahi.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-muted-foreground"><tr>
                  <th className="text-left py-2">Source</th><th className="text-left py-2">Preview</th><th className="text-left py-2">Status</th><th className="text-left py-2">Time</th>
                </tr></thead>
                <tbody>
                  {done.slice(0, 20).map(it => (
                    <tr key={it.id} className="border-t border-border">
                      <td className="py-2">{it.channel_sources?.name}</td>
                      <td className="py-2 truncate max-w-[300px]">{(it.ai_content || it.content)?.slice(0, 80)}</td>
                      <td className="py-2"><Badge variant={it.status === "published" ? "success" : it.status === "failed" ? "warning" : "default" as any}>{it.status}</Badge></td>
                      <td className="py-2 text-xs">{new Date(it.published_at ?? it.fetched_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setAdding(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
          <Card className="w-full">
            <h2 className="font-semibold mb-3">Add Source Channel</h2>
            <div className="space-y-3">
              <label className="block text-sm">Display name
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My News Channel" className="mt-1" />
              </label>
              <label className="block text-sm">Telegram channel @username
                <Input value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} placeholder="@channelname" className="mt-1" />
              </label>
              <label className="block text-sm">Bot account
                <select value={form.bot_account_id} onChange={e => setForm({ ...form, bot_account_id: e.target.value })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">— select bot —</option>
                  {bots.map(b => <option key={b.id} value={b.id}>{b.handle}</option>)}
                </select>
              </label>
              {bots.length === 0 && <div className="text-xs text-warning">Pehle Connections → Telegram bot add karein.</div>}
              <div className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                <span>Auto-publish (no approval)</span>
                <Toggle checked={form.auto_publish} onChange={v => setForm({ ...form, auto_publish: v })} />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                <span><Zap className="h-3 w-3 inline" /> AI rewrite per platform</span>
                <Toggle checked={form.ai_rewrite} onChange={v => setForm({ ...form, ai_rewrite: v })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Btn onClick={() => setAdding(false)}>Cancel</Btn>
                <Btn variant="primary" onClick={addSource}>Save</Btn>
              </div>
            </div>
          </Card>
          </div>
        </div>
      )}
    </>
  );
}
