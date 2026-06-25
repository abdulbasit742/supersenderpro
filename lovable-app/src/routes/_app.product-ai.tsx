import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Copy, RefreshCw, Instagram, MessageCircle, FileText, Send } from "lucide-react";
import type { ContentType, GeneratedContent } from "@/lib/product-ai.functions";

export const Route = createFileRoute("/_app/product-ai")({
  component: ProductAIPage,
});

const CONTENT_TYPES: { type: ContentType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "whatsapp_post", label: "WhatsApp Broadcast", icon: <MessageCircle className="h-4 w-4" />, desc: "Short, conversational, with Urdu flair" },
  { type: "instagram_caption", label: "Instagram Caption", icon: <Instagram className="h-4 w-4" />, desc: "Trendy with 20-25 hashtags" },
  { type: "product_description", label: "Product Description", icon: <FileText className="h-4 w-4" />, desc: "Professional features & benefits" },
  { type: "sales_message", label: "Sales Message", icon: <Send className="h-4 w-4" />, desc: "Personalized WA message to a customer" },
  { type: "broadcast", label: "Promotional Blast", icon: <Sparkles className="h-4 w-4" />, desc: "Urgent limited-time offer" },
];

const SAMPLE_PRODUCTS = ["ChatGPT Plus", "Claude Pro", "Midjourney Basic", "LinkedIn Premium", "Canva Pro", "Adobe Creative Cloud"];

const TONES = ["friendly", "professional", "urgent", "humorous"] as const;

export default function ProductAIPage() {
  const [form, setForm] = useState({ productName: "", price: "", description: "", category: "", contentType: "whatsapp_post" as ContentType, tone: "friendly" as typeof TONES[number], customerName: "" });
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GeneratedContent[]>([]);

  const genMut = useMutation({
    mutationFn: async () => {
      const { generateProductContent } = await import("@/lib/product-ai.functions");
      return generateProductContent({ data: { productName: form.productName, price: form.price ? Number(form.price) : undefined, description: form.description || undefined, category: form.category || undefined, contentType: form.contentType, tone: form.tone, customerName: form.customerName || undefined } });
    },
    onSuccess: (data) => { setResult(data); setHistory(p => [data, ...p].slice(0, 10)); },
  });

  const copyResult = () => {
    if (!result) return;
    void navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedTypeInfo = CONTENT_TYPES.find(t => t.type === form.contentType);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI Content Generator</h1>
        <p className="text-muted-foreground text-sm">Generate WhatsApp posts, Instagram captions, and sales messages with AI — tailored for Pakistani resellers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Product Details</h3>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Product Name</label>
              <div className="flex gap-2">
                <input value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} placeholder="e.g. ChatGPT Plus" className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background" />
                <select onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} className="px-2 py-2 border rounded-lg text-xs bg-background" defaultValue="">
                  <option value="" disabled>Sample</option>
                  {SAMPLE_PRODUCTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Price (PKR)</label><input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="4200" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Category</label><input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="AI Tools" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">Brief Description (optional)</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Key features or selling points…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Content Type</h3>
            <div className="grid grid-cols-1 gap-2">
              {CONTENT_TYPES.map(ct => (
                <button key={ct.type} onClick={() => setForm(p => ({ ...p, contentType: ct.type }))} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${form.contentType === ct.type ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                  {ct.icon}
                  <div><div className="text-sm font-medium">{ct.label}</div><div className={`text-xs ${form.contentType === ct.type ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{ct.desc}</div></div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Tone & Options</h3>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tone</label>
              <div className="grid grid-cols-4 gap-1.5">
                {TONES.map(t => <button key={t} onClick={() => setForm(p => ({ ...p, tone: t }))} className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${form.tone === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{t}</button>)}
              </div>
            </div>
            {form.contentType === "sales_message" && <div><label className="text-xs text-muted-foreground block mb-1">Customer Name (for personalization)</label><input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="Ahmed bhai" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>}
          </div>

          <button onClick={() => genMut.mutate()} disabled={!form.productName || genMut.isPending} className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />{genMut.isPending ? "AI Generating Content…" : `Generate ${selectedTypeInfo?.label ?? "Content"}`}
          </button>
        </div>

        <div className="space-y-4">
          {result ? (
            <div className="bg-card border rounded-xl p-4 space-y-3 sticky top-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">{selectedTypeInfo?.icon} Generated Content</h3>
                <div className="flex gap-2">
                  <button onClick={() => genMut.mutate()} disabled={genMut.isPending} className="p-1.5 hover:bg-accent rounded" title="Regenerate"><RefreshCw className={`h-4 w-4 ${genMut.isPending ? "animate-spin" : ""}`} /></button>
                  <button onClick={copyResult} className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs hover:bg-accent"><Copy className="h-3.5 w-3.5" />{copied ? "Copied!" : "Copy"}</button>
                </div>
              </div>
              <div className="bg-[#ECE5DD] rounded-xl p-4">
                <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-sm shadow-sm">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{result.text}</pre>
                </div>
              </div>
              {result.hashtags && result.hashtags.length > 0 && (
                <div><p className="text-xs text-muted-foreground mb-1.5">Hashtags</p><div className="flex flex-wrap gap-1">{result.hashtags.map(h => <span key={h} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{h.startsWith("#") ? h : `#${h}`}</span>)}</div></div>
              )}
              <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                <span>{result.wordCount} words</span>
                <span>{result.type.replace(/_/g," ")}</span>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
              <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium mb-1">AI-generated content will appear here</p>
              <p className="text-sm">Fill in product details and click Generate</p>
            </div>
          )}

          {history.length > 1 && (
            <div className="bg-card border rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-sm">History</h3>
              {history.slice(1).map((h, i) => (
                <button key={i} onClick={() => setResult(h)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm">
                  <div className="text-xs text-muted-foreground mb-0.5">{h.type.replace(/_/g, " ")}</div>
                  <div className="truncate">{h.text.slice(0, 80)}…</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
