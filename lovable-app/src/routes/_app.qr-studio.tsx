import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QrCode, Copy, Download, Trash2, Plus, ExternalLink } from "lucide-react";
import type { QRLink } from "@/lib/qr-studio.functions";

export const Route = createFileRoute("/_app/qr-studio")({
  component: QRStudioPage,
});

type Tab = "studio" | "saved" | "bulk";

const MOCK_QR_LINKS: QRLink[] = [
  { id: "q1", label: "Main Business WA", type: "whatsapp", whatsappNumber: "03001234567", prefilledMessage: "Hi! I'd like to place an order.", finalUrl: "https://wa.me/923001234567?text=Hi%21%20I%27d%20like%20to%20place%20an%20order.", qrDataUrl: "https://api.qrserver.com/v1/create-qr-code/?data=https%3A%2F%2Fwa.me%2F923001234567&size=200x200", shortCode: "WA1234", clicks: 47, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "q2", label: "ChatGPT Plus Order", type: "whatsapp", whatsappNumber: "03001234567", prefilledMessage: "Hi! I want to order ChatGPT Plus. Please share price and details.", finalUrl: "https://wa.me/923001234567?text=Hi%21%20I%20want%20to%20order%20ChatGPT%20Plus.", qrDataUrl: "https://api.qrserver.com/v1/create-qr-code/?data=https%3A%2F%2Fwa.me%2F923001234567%3Ftext%3DChatGPT&size=200x200", shortCode: "CGPT99", clicks: 23, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
];

const TYPE_LABELS = { whatsapp: "WhatsApp Chat", catalog: "Product Catalog", payment: "Payment", custom: "Custom URL" };
const TYPE_COLORS = { whatsapp: "bg-green-100 text-green-700", catalog: "bg-blue-100 text-blue-700", payment: "bg-yellow-100 text-yellow-700", custom: "bg-purple-100 text-purple-700" };

function QRCodeImage({ url, size = 128 }: { url: string; size?: number }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=${size}x${size}&format=png&margin=10`;
  return <img src={qrUrl} alt="QR Code" width={size} height={size} className="rounded-lg border" />;
}

export default function QRStudioPage() {
  const [tab, setTab] = useState<Tab>("studio");
  const [form, setForm] = useState({ label: "", type: "whatsapp" as QRLink["type"], whatsappNumber: "", prefilledMessage: "", customUrl: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState("");
  const qc = useQueryClient();

  const { data: savedLinks = MOCK_QR_LINKS } = useQuery({
    queryKey: ["qr-links"], queryFn: async () => { const { getQRLinks } = await import("@/lib/qr-studio.functions"); return getQRLinks(); }, placeholderData: MOCK_QR_LINKS, staleTime: 60_000,
  });

  const buildPreviewUrl = () => {
    if (form.type === "whatsapp" && form.whatsappNumber) {
      const clean = form.whatsappNumber.replace(/\D/g, "");
      return form.prefilledMessage ? `https://wa.me/${clean}?text=${encodeURIComponent(form.prefilledMessage)}` : `https://wa.me/${clean}`;
    }
    return form.customUrl || "";
  };

  const previewUrl = buildPreviewUrl();

  const saveMut = useMutation({
    mutationFn: async () => {
      const { saveQRLink } = await import("@/lib/qr-studio.functions");
      return saveQRLink({ data: { label: form.label, type: form.type, whatsappNumber: form.whatsappNumber || undefined, prefilledMessage: form.prefilledMessage || undefined, customUrl: form.customUrl || undefined } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qr-links"] }); setTab("saved"); setForm({ label: "", type: "whatsapp", whatsappNumber: "", prefilledMessage: "", customUrl: "" }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { deleteQRLink } = await import("@/lib/qr-studio.functions"); return deleteQRLink({ data: { id } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qr-links"] }),
  });

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode className="h-6 w-6 text-primary" /> QR Code Studio</h1>
        <p className="text-muted-foreground text-sm">Generate click-to-chat QR codes for WhatsApp, payments, and products</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 text-center"><div className="text-2xl font-bold">{savedLinks.length}</div><div className="text-sm text-muted-foreground">Saved QR Codes</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-700">{savedLinks.filter(q => q.type === "whatsapp").length}</div><div className="text-sm text-green-600">WhatsApp Links</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-blue-700">{(savedLinks as typeof MOCK_QR_LINKS).reduce((s, q) => s + q.clicks, 0)}</div><div className="text-sm text-blue-600">Total Scans</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["studio","saved","bulk"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "studio" ? "Create QR" : t === "saved" ? "Saved QR Codes" : "Bulk Generator"}
          </button>
        ))}
      </div>

      {tab === "studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">QR Configuration</h3>
              <div><label className="text-xs text-muted-foreground block mb-1">Label</label><input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Main Business Chat" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["whatsapp","catalog","payment","custom"] as const).map(t => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${form.type === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{TYPE_LABELS[t]}</button>
                  ))}
                </div>
              </div>
              {(form.type === "whatsapp" || form.type === "catalog" || form.type === "payment") && (
                <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp Number</label><input value={form.whatsappNumber} onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
              )}
              {form.type === "whatsapp" && (
                <div><label className="text-xs text-muted-foreground block mb-1">Pre-filled Message (optional)</label><textarea value={form.prefilledMessage} onChange={e => setForm(p => ({ ...p, prefilledMessage: e.target.value }))} rows={2} placeholder="Hi! I'd like to place an order…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
              )}
              {form.type === "custom" && (
                <div><label className="text-xs text-muted-foreground block mb-1">URL</label><input value={form.customUrl} onChange={e => setForm(p => ({ ...p, customUrl: e.target.value }))} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveMut.mutate()} disabled={!form.label || (!previewUrl && !form.customUrl) || saveMut.isPending} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Saving…" : "Save QR Code"}</button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-4 text-center space-y-3">
              <h3 className="font-semibold">Live Preview</h3>
              {previewUrl ? (
                <>
                  <div className="flex justify-center"><QRCodeImage url={previewUrl} size={180} /></div>
                  <p className="text-xs text-muted-foreground break-all bg-muted rounded px-2 py-1.5">{previewUrl}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => copyToClipboard(previewUrl, "preview")} className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs hover:bg-accent"><Copy className="h-3.5 w-3.5" />{copied === "preview" ? "Copied!" : "Copy Link"}</button>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs hover:bg-accent"><ExternalLink className="h-3.5 w-3.5" />Open</a>
                  </div>
                </>
              ) : <div className="py-12 text-muted-foreground text-sm"><QrCode className="h-16 w-16 mx-auto mb-3 opacity-20" /><p>Fill in the details to see live QR preview</p></div>}
            </div>
          </div>
        </div>
      )}

      {tab === "saved" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(savedLinks as typeof MOCK_QR_LINKS).map(link => (
            <div key={link.id} className="bg-card border rounded-xl p-4 text-center">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-left truncate">{link.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${TYPE_COLORS[link.type]}`}>{link.type}</span>
              </div>
              <div className="flex justify-center mb-3"><QRCodeImage url={link.finalUrl} size={150} /></div>
              <p className="text-xs text-muted-foreground mb-3 truncate">{link.finalUrl}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Scans: <strong className="text-foreground">{link.clicks}</strong></span>
                <span className="font-mono">{link.shortCode}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(link.finalUrl, link.id)} className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Copy className="h-3 w-3" />{copied === link.id ? "Copied!" : "Copy"}</button>
                <a href={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(link.finalUrl)}&size=400x400&format=png`} download={`${link.shortCode}.png`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Download className="h-3 w-3" /></a>
                <button onClick={() => deleteMut.mutate(link.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => setTab("studio")} className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-accent hover:text-foreground min-h-48 transition-colors">
            <Plus className="h-8 w-8" /><span className="text-sm">Add New QR Code</span>
          </button>
        </div>
      )}

      {tab === "bulk" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Bulk QR Generator</strong> — Generate QR codes for all your products at once. Each QR opens a pre-filled WhatsApp message with the product name and price.
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Your Products</h3>
            {[
              { name: "ChatGPT Plus", price: 4200, whatsapp: "03001234567" },
              { name: "Claude Pro", price: 3500, whatsapp: "03001234567" },
              { name: "Midjourney Basic", price: 2800, whatsapp: "03001234567" },
              { name: "LinkedIn Premium", price: 5500, whatsapp: "03001234567" },
            ].map(p => {
              const msg = `Hi! I'm interested in *${p.name}* at PKR ${p.price.toLocaleString()}. Please confirm availability.`;
              const url = `https://wa.me/92${p.whatsapp.replace(/^0/, "")}?text=${encodeURIComponent(msg)}`;
              return (
                <div key={p.name} className="flex items-center gap-4 p-3 border rounded-xl hover:bg-muted/30">
                  <QRCodeImage url={url} size={80} />
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">PKR {p.price.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1 break-all line-clamp-1">{url}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => copyToClipboard(url, `bulk-${p.name}`)} className="flex items-center gap-1 px-2 py-1 border rounded text-xs hover:bg-accent"><Copy className="h-3 w-3" />{copied === `bulk-${p.name}` ? "Copied!" : "Copy"}</button>
                    <a href={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=400x400&format=png`} download={`${p.name.replace(/\s/g,"-")}-qr.png`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 border rounded text-xs hover:bg-accent"><Download className="h-3 w-3" />Save</a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
