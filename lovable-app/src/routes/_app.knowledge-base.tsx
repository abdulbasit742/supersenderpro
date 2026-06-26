import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Plus, Trash2, ThumbsUp, ThumbsDown, Bot } from "lucide-react";
import type { KBArticle, ArticleCategory } from "@/lib/knowledge-base.functions";

export const Route = createFileRoute("/_app/knowledge-base")({
  component: KnowledgeBasePage,
});

type Tab = "articles" | "add";

const MOCK_ARTICLES: KBArticle[] = [
  { id: "kb1", title: "ChatGPT Plus kaise use karein?", content: "ChatGPT Plus use karne ke liye:\n1. chat.openai.com par jayein\n2. Humari email se login karein\n3. Plus badge confirm karein", category: "product", tags: ["chatgpt","login"], views: 234, helpful: 45, notHelpful: 3, usedByBot: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "kb2", title: "Payment kaise karein?", content: "JazzCash ya EasyPaisa se payment bhejein. Screenshot zaroor attach karein!", category: "payment", tags: ["jazzcash","easypaisa"], views: 456, helpful: 89, notHelpful: 5, usedByBot: true, createdAt: new Date(Date.now() - 25 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "kb3", title: "Subscription expire ho gayi?", content: "RENEW [product name] reply karein. Payment ke baad 30 min mein renewal ho jayegi.", category: "account", tags: ["renewal","expired"], views: 189, helpful: 67, notHelpful: 8, usedByBot: true, createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "kb4", title: "Netflix error fix", content: "App clear cache karein, logout karein. Agar phir bhi issue ho — screenshot bhejein, 2 ghante mein fix!", category: "troubleshooting", tags: ["netflix","error"], views: 345, helpful: 123, notHelpful: 12, usedByBot: false, createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "kb5", title: "Refund policy", content: "Technical issue: 100% refund. 24h mein cancel: 80% refund. Baad mein: no refund.", category: "policy", tags: ["refund"], views: 267, helpful: 78, notHelpful: 34, usedByBot: false, createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];

const CAT_LABELS: Record<ArticleCategory, string> = { account: "Account", payment: "Payment", product: "Product", troubleshooting: "Troubleshooting", policy: "Policy", faq: "FAQ" };
const CAT_COLORS: Record<ArticleCategory, string> = { account: "bg-blue-100 text-blue-700", payment: "bg-green-100 text-green-700", product: "bg-purple-100 text-purple-700", troubleshooting: "bg-red-100 text-red-700", policy: "bg-orange-100 text-orange-700", faq: "bg-yellow-100 text-yellow-700" };

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState<Tab>("articles");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KBArticle | null>(null);
  const [newArticle, setNewArticle] = useState({ title: "", content: "", category: "faq" as ArticleCategory, tags: "", usedByBot: false });
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: articles = MOCK_ARTICLES } = useQuery({ queryKey: ["kb-articles", catFilter, search], queryFn: async () => { const { getKBArticles } = await import("@/lib/knowledge-base.functions"); return getKBArticles({ data: { category: catFilter === "all" ? undefined : catFilter, search: search || undefined } }); }, placeholderData: MOCK_ARTICLES, staleTime: 60_000 });

  const saveMut = useMutation({ mutationFn: async () => { const { saveKBArticle } = await import("@/lib/knowledge-base.functions"); return saveKBArticle({ data: { ...newArticle, tags: newArticle.tags.split(",").map(t => t.trim()) } }); }, onSuccess: () => { setTab("articles"); setNewArticle({ title: "", content: "", category: "faq", tags: "", usedByBot: false }); } });
  const deleteMut = useMutation({ mutationFn: async (id: string) => { const { deleteKBArticle } = await import("@/lib/knowledge-base.functions"); await deleteKBArticle({ data: { articleId: id } }); return id; }, onSuccess: (id) => { setDeleted(p => new Set([...p, id])); setSelected(null); } });
  const voteMut = useMutation({ mutationFn: async ({ id, vote }: { id: string; vote: "helpful" | "not_helpful" }) => { const { voteArticle } = await import("@/lib/knowledge-base.functions"); return voteArticle({ data: { articleId: id, vote } }); } });

  const visible = (articles as typeof MOCK_ARTICLES).filter(a => !deleted.has(a.id));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Knowledge Base</h1><p className="text-muted-foreground text-sm">FAQ articles — used by your support team and chatbot to answer customer questions</p></div>
        <button onClick={() => setTab("add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Add Article</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{visible.length}</div><div className="text-xs text-muted-foreground">Articles</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700"><Bot className="h-5 w-5 inline mr-1" />{visible.filter(a => a.usedByBot).length}</div><div className="text-xs text-green-600">Used by Bot</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{visible.reduce((s, a) => s + a.views, 0)}</div><div className="text-xs text-muted-foreground">Total Views</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["articles","add"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "add" ? "Add Article" : "Articles"}</button>)}
      </div>

      {tab === "articles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />
            <div className="flex flex-wrap gap-1">{["all", ...Object.keys(CAT_LABELS)].map(c => <button key={c} onClick={() => setCatFilter(c)} className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${catFilter === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{c === "all" ? "All" : CAT_LABELS[c as ArticleCategory]}</button>)}</div>
            {visible.map(a => (
              <button key={a.id} onClick={() => setSelected(a)} className={`w-full text-left bg-card border rounded-xl p-3 transition-colors ${selected?.id === a.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                <div className="flex items-start justify-between gap-1 mb-1"><span className="font-medium text-sm leading-tight">{a.title}</span>{a.usedByBot && <Bot className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />}</div>
                <div className="flex items-center gap-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CAT_COLORS[a.category]}`}>{CAT_LABELS[a.category]}</span><span className="text-xs text-muted-foreground">{a.views} views</span></div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2">
            {selected ? (
              <div className="bg-card border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div><h3 className="font-bold text-lg">{selected.title}</h3><div className="flex items-center gap-2 mt-1"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[selected.category]}`}>{CAT_LABELS[selected.category]}</span>{selected.usedByBot && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1"><Bot className="h-3 w-3" />Bot</span>}</div></div>
                  <button onClick={() => deleteMut.mutate(selected.id)} disabled={deleteMut.isPending} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 text-sm whitespace-pre-line">{selected.content}</div>
                <div className="flex gap-1 flex-wrap">{selected.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded font-mono">{t}</span>)}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-2">
                  <span>{selected.views} views</span>
                  <button onClick={() => voteMut.mutate({ id: selected.id, vote: "helpful" })} className="flex items-center gap-1 hover:text-green-600"><ThumbsUp className="h-4 w-4" />{selected.helpful}</button>
                  <button onClick={() => voteMut.mutate({ id: selected.id, vote: "not_helpful" })} className="flex items-center gap-1 hover:text-red-500"><ThumbsDown className="h-4 w-4" />{selected.notHelpful}</button>
                  <span className="ml-auto text-xs">Updated {new Date(selected.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Select an article to read</div>}
          </div>
        </div>
      )}

      {tab === "add" && (
        <div className="max-w-lg bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">New KB Article</h3>
          <div><label className="text-xs text-muted-foreground block mb-1">Title</label><input value={newArticle.title} onChange={e => setNewArticle(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Category</label><select value={newArticle.category} onChange={e => setNewArticle(p => ({ ...p, category: e.target.value as ArticleCategory }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Content</label><textarea value={newArticle.content} onChange={e => setNewArticle(p => ({ ...p, content: e.target.value }))} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Tags (comma separated)</label><input value={newArticle.tags} onChange={e => setNewArticle(p => ({ ...p, tags: e.target.value }))} placeholder="login, password, credentials" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newArticle.usedByBot} onChange={e => setNewArticle(p => ({ ...p, usedByBot: e.target.checked }))} /><Bot className="h-4 w-4 text-green-600" />Use in Chatbot auto-replies</label>
          <button onClick={() => saveMut.mutate()} disabled={!newArticle.title || !newArticle.content || saveMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{saveMut.isPending ? "Saving…" : "Publish Article"}</button>
        </div>
      )}
    </div>
  );
}
