import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Send, Plus, Eye, Copy } from "lucide-react";
import type { MessageTemplate, PersonalizedPreview } from "@/lib/message-personalizer.functions";

export const Route = createFileRoute("/_app/message-personalizer")({
  component: MessagePersonalizerPage,
});

type Tab = "templates" | "compose" | "preview";

const MOCK_TEMPLATES: MessageTemplate[] = [
  { id: "t1", name: "Renewal Reminder", template: "Assalam Alaikum {{name}} bhai! 👋\n\nAapka {{product}} subscription *{{days}} din mein expire* hone wala hai.\n\nRenewal ke liye sirf *PKR {{price}}* — abhi reply karo YES!\n\n_SuperSender Pro_", variables: ["name", "product", "days", "price"], category: "renewal", usageCount: 234 },
  { id: "t2", name: "Welcome New Customer", template: "🎉 Welcome {{name}}!\n\nSuperSender Pro family mein aapka khairmaqdaam!\n\nAapka pehla order *{{product}}* ready hai.\n\nCredentials abhi bhej rahe hain — ek minute! ⏳", variables: ["name", "product"], category: "welcome", usageCount: 567 },
  { id: "t3", name: "Flash Sale Blast", template: "🚨 *FLASH SALE — Sirf {{hours}} Ghante!*\n\n{{product}} pe *{{discount}}% OFF*\n\nNormal Price: PKR {{original}}\n*SALE Price: PKR {{sale}}*\n\n⏰ Offer {{time}} pe khatam!\nAbhi reply: BUY", variables: ["hours", "product", "discount", "original", "sale", "time"], category: "offer", usageCount: 89 },
  { id: "t4", name: "Follow-up Inactive", template: "Assalam Alaikum {{name}}!\n\nAapko yaad kar raha tha 😊\n\n{{days}} din se aapka koi order nahi aaya.\n\nKya koi masla hai? Reply karo aur main personally help karunga!\n\n_{{agentName}}_", variables: ["name", "days", "agentName"], category: "followup", usageCount: 145 },
];

const SAMPLE_CONTACTS = [
  { name: "Ahmed Khan", product: "ChatGPT Plus", days: "3", price: "3500", whatsapp: "03001234567", discount: "20", original: "3500", sale: "2800", hours: "4", time: "12 AM", agentName: "Support Team" },
  { name: "Sara Ali", product: "Netflix Premium", days: "7", price: "2500", whatsapp: "03111234567", discount: "20", original: "2500", sale: "2000", hours: "4", time: "12 AM", agentName: "Support Team" },
];

const CAT_COLORS = { broadcast: "bg-purple-100 text-purple-700", renewal: "bg-blue-100 text-blue-700", welcome: "bg-green-100 text-green-700", offer: "bg-yellow-100 text-yellow-700", followup: "bg-orange-100 text-orange-700", custom: "bg-gray-100 text-gray-600" };

export default function MessagePersonalizerPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(MOCK_TEMPLATES[0]);
  const [customMsg, setCustomMsg] = useState("");
  const [contactsCSV, setContactsCSV] = useState("name,product,days,price,whatsapp\nAhmed Khan,ChatGPT Plus,3,3500,03001234567\nSara Ali,Netflix Premium,7,2500,03111234567");
  const [previews, setPreviews] = useState<PersonalizedPreview[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: templates = MOCK_TEMPLATES } = useQuery({ queryKey: ["msg-templates"], queryFn: async () => { const { getTemplates } = await import("@/lib/message-personalizer.functions"); return getTemplates(); }, placeholderData: MOCK_TEMPLATES, staleTime: 300_000 });

  const previewMut = useMutation({ mutationFn: async () => { const { previewPersonalized } = await import("@/lib/message-personalizer.functions"); const contacts = contactsCSV.trim().split("\n").slice(1).map(row => { const cols = contactsCSV.split("\n")[0].split(","); const vals = row.split(","); return Object.fromEntries(cols.map((c, i) => [c.trim(), vals[i]?.trim() ?? ""])); }); return previewPersonalized({ data: { template: customMsg || selectedTemplate.template, contacts } }); }, onSuccess: (r) => { setPreviews(r as PersonalizedPreview[]); setTab("preview"); } });
  const sendMut = useMutation({ mutationFn: async () => { const { sendPersonalizedBatch } = await import("@/lib/message-personalizer.functions"); const contacts = SAMPLE_CONTACTS; return sendPersonalizedBatch({ data: { template: customMsg || selectedTemplate.template, contacts: contacts as unknown as Record<string, string>[] } }); } });

  const copy = (text: string, id: string) => { void navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Pencil className="h-6 w-6 text-primary" /> Message Personalizer</h1>
        <p className="text-muted-foreground text-sm">Craft personalized bulk WhatsApp messages with variable substitution — preview before send</p>
      </div>

      <div className="flex gap-1 border-b">
        {(["templates","compose","preview"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(templates as typeof MOCK_TEMPLATES).map(t => (
            <div key={t.id} className={`bg-card border rounded-xl p-4 cursor-pointer transition-colors ${selectedTemplate.id === t.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`} onClick={() => setSelectedTemplate(t)}>
              <div className="flex items-center justify-between mb-2"><span className="font-semibold">{t.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[t.category]}`}>{t.category}</span></div>
              <div className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3 bg-muted/30 rounded-lg p-2 mb-2">{t.template}</div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">{t.variables.map(v => <span key={v} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded font-mono">{`{{${v}}}`}</span>)}</div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); copy(t.template, t.id); }} className="p-1.5 hover:bg-accent rounded text-muted-foreground"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); setSelectedTemplate(t); setTab("compose"); }} className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">Use</button>
                </div>
              </div>
              {copied === t.id && <div className="text-xs text-green-600 mt-1">Copied!</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Message Template (variables: {`{{name}}, {{product}}, etc.`})</label><textarea value={customMsg || selectedTemplate.template} onChange={e => setCustomMsg(e.target.value)} rows={8} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none font-mono" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Contacts (CSV format: first row = headers)</label><textarea value={contactsCSV} onChange={e => setContactsCSV(e.target.value)} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none font-mono text-xs" /></div>
            <div className="flex gap-2">
              <button onClick={() => previewMut.mutate()} disabled={previewMut.isPending} className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium"><Eye className="h-4 w-4" />{previewMut.isPending ? "Generating…" : "Preview"}</button>
              <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium"><Send className="h-4 w-4" />{sendMut.isPending ? "Sending…" : "Send All"}</button>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Live Preview (first contact)</div>
            <div className="bg-[#ECE5DD] p-4 rounded-xl min-h-40">
              {(customMsg || selectedTemplate.template) && SAMPLE_CONTACTS[0] ? (() => { let msg = customMsg || selectedTemplate.template; Object.entries(SAMPLE_CONTACTS[0]).forEach(([k,v]) => { msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v); }); return <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 max-w-xs text-sm whitespace-pre-line shadow-sm">{msg}</div>; })() : <div className="text-muted-foreground text-sm">Message preview will appear here</div>}
            </div>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">{previews.length} Personalized Previews</h3>
            <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium"><Send className="h-4 w-4" />{sendMut.isPending ? "Sending…" : `Send All ${previews.length}`}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {previews.map((p, i) => (
              <div key={i} className="bg-card border rounded-xl p-3">
                <div className="text-xs font-mono text-muted-foreground mb-2">{p.customerName} · {p.whatsapp}</div>
                <div className="bg-[#ECE5DD] p-3 rounded-lg"><div className="bg-white rounded-xl rounded-tl-none px-3 py-2 text-sm whitespace-pre-line shadow-sm">{p.message}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
