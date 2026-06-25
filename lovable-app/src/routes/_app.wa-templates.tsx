import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus, Trash2, Send, CheckCircle, Clock, XCircle, PauseCircle, Eye } from "lucide-react";
import type { WATemplate, WATemplateComponent } from "@/lib/wa-templates.functions";

export const Route = createFileRoute("/_app/wa-templates")({
  component: WATemplatesPage,
});

type Tab = "list" | "create" | "send";

const STATUS_ICONS = {
  APPROVED: <CheckCircle className="h-4 w-4 text-green-500" />,
  PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
  REJECTED: <XCircle className="h-4 w-4 text-red-500" />,
  PAUSED: <PauseCircle className="h-4 w-4 text-orange-500" />,
  DISABLED: <XCircle className="h-4 w-4 text-gray-400" />,
};

const CATEGORY_COLORS = {
  MARKETING: "bg-blue-100 text-blue-700",
  UTILITY: "bg-green-100 text-green-700",
  AUTHENTICATION: "bg-purple-100 text-purple-700",
};

function renderTemplate(components: WATemplateComponent[]): string {
  return components.map((c) => {
    if (c.type === "BODY" || c.type === "HEADER" || c.type === "FOOTER") return c.text ?? "";
    if (c.type === "BUTTONS") return (c.buttons ?? []).map((b) => `[${b.text}]`).join(" ");
    return "";
  }).filter(Boolean).join("\n");
}

export default function WATemplatesPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<WATemplate | null>(null);
  const [sendModal, setSendModal] = useState<WATemplate | null>(null);
  const [sendTo, setSendTo] = useState("");
  const [sendParams, setSendParams] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState({ name: "", language: "en", category: "UTILITY" as WATemplate["category"], bodyText: "", headerText: "", footerText: "", buttons: [{ type: "QUICK_REPLY" as const, text: "" }] });
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["wa-templates"],
    queryFn: async () => { const { getTemplates } = await import("@/lib/wa-templates.functions"); return getTemplates(); },
    placeholderData: [],
    staleTime: 60_000,
  });

  const deleteMut = useMutation({
    mutationFn: async ({ name, id }: { name: string; id: string }) => { const { deleteTemplate } = await import("@/lib/wa-templates.functions"); return deleteTemplate({ data: { name, id } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-templates"] }),
  });

  const sendMut = useMutation({
    mutationFn: async ({ template, to, params }: { template: WATemplate; to: string; params: string[] }) => {
      const { sendTemplateMessage } = await import("@/lib/wa-templates.functions");
      return sendTemplateMessage({ data: { to, templateName: template.name, language: template.language, parameters: params } });
    },
    onSuccess: () => setSendModal(null),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { createTemplate } = await import("@/lib/wa-templates.functions");
      const components: WATemplateComponent[] = [];
      if (newTemplate.headerText) components.push({ type: "HEADER", format: "TEXT", text: newTemplate.headerText });
      if (newTemplate.bodyText) components.push({ type: "BODY", text: newTemplate.bodyText });
      if (newTemplate.footerText) components.push({ type: "FOOTER", text: newTemplate.footerText });
      if (newTemplate.buttons.some((b) => b.text)) components.push({ type: "BUTTONS", buttons: newTemplate.buttons.filter((b) => b.text) });
      return createTemplate({ data: { name: newTemplate.name, language: newTemplate.language, category: newTemplate.category, components } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wa-templates"] }); setTab("list"); },
  });

  const filtered = templates.filter((t) => !search || t.name.includes(search.toLowerCase()) || t.status.includes(search.toUpperCase()));
  const approved = templates.filter((t) => t.status === "APPROVED").length;
  const pending = templates.filter((t) => t.status === "PENDING").length;

  const countParams = (text: string) => (text.match(/\{\{\d+\}\}/g) ?? []).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> WhatsApp Message Templates</h1>
          <p className="text-muted-foreground text-sm">Create, manage, and send Meta-approved message templates</p>
        </div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> New Template</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-700">{approved}</div><div className="text-sm text-green-600">Approved</div></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-yellow-700">{pending}</div><div className="text-sm text-yellow-600">Under Review</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-blue-700">{templates.length}</div><div className="text-sm text-blue-600">Total</div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["list","create","send"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "list" ? "All Templates" : t === "create" ? "Create New" : "Send Template"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="space-y-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…" className="w-full max-w-sm px-3 py-2 border rounded-lg text-sm bg-background" />
          {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading templates…</div> : null}
          {filtered.map((t) => (
            <div key={t.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono text-sm font-semibold">{t.name}</code>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[t.category]}`}>{t.category}</span>
                    <span className="text-xs text-muted-foreground">{t.language}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {STATUS_ICONS[t.status]}
                    <span className="text-xs font-medium">{t.status}</span>
                  </div>
                  <div className="bg-[#ECE5DD] rounded-xl p-3 max-w-sm">
                    <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-800 whitespace-pre-line shadow-sm">
                      {renderTemplate(t.components)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setSendModal(t); setSendParams(Array(countParams(renderTemplate(t.components))).fill("")); setTab("send"); }} className="px-3 py-1.5 bg-[#25D366] text-white rounded text-xs font-medium flex items-center gap-1 hover:opacity-90"><Send className="h-3 w-3" /> Send</button>
                  <button onClick={() => setPreview(t)} className="px-3 py-1.5 border rounded text-xs flex items-center gap-1 hover:bg-accent"><Eye className="h-3 w-3" /> Preview</button>
                  <button onClick={() => deleteMut.mutate({ name: t.name, id: t.id })} className="px-3 py-1.5 text-destructive border border-destructive/30 rounded text-xs flex items-center gap-1 hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Template Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name (lowercase, underscores only)</label>
                <input value={newTemplate.name} onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"") }))} placeholder="order_confirmation" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category</label>
                <select value={newTemplate.category} onChange={(e) => setNewTemplate((p) => ({ ...p, category: e.target.value as WATemplate["category"] }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                  <option value="UTILITY">Utility (transactional)</option>
                  <option value="MARKETING">Marketing (promotional)</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Header (optional)</label>
              <input value={newTemplate.headerText} onChange={(e) => setNewTemplate((p) => ({ ...p, headerText: e.target.value }))} placeholder="Order Confirmed! 🎉" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Body — use {`{{1}} {{2}}`} for variables</label>
              <textarea value={newTemplate.bodyText} onChange={(e) => setNewTemplate((p) => ({ ...p, bodyText: e.target.value }))} rows={4} placeholder="Hi {{1}}, your order for {{2}} worth PKR {{3}} is confirmed!" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Footer (optional)</label>
              <input value={newTemplate.footerText} onChange={(e) => setNewTemplate((p) => ({ ...p, footerText: e.target.value }))} placeholder="SuperSender Pro" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Quick Reply Buttons</label>
              {newTemplate.buttons.map((btn, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input value={btn.text} onChange={(e) => setNewTemplate((p) => ({ ...p, buttons: p.buttons.map((b, j) => j === i ? { ...b, text: e.target.value } : b) }))} placeholder="Button text" className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background" />
                  {i > 0 && <button onClick={() => setNewTemplate((p) => ({ ...p, buttons: p.buttons.filter((_, j) => j !== i) }))} className="px-2 py-2 text-destructive border border-destructive/30 rounded-lg"><Trash2 className="h-3 w-3" /></button>}
                </div>
              ))}
              {newTemplate.buttons.length < 3 && <button onClick={() => setNewTemplate((p) => ({ ...p, buttons: [...p.buttons, { type: "QUICK_REPLY" as const, text: "" }] }))} className="text-xs text-primary flex items-center gap-1 mt-1"><Plus className="h-3 w-3" /> Add Button</button>}
            </div>
          </div>

          {/* Preview */}
          {newTemplate.bodyText && (
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Preview</h3>
              <div className="bg-[#ECE5DD] rounded-xl p-3 max-w-sm">
                <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-800 shadow-sm">
                  {newTemplate.headerText && <div className="font-bold mb-1">{newTemplate.headerText}</div>}
                  <div className="whitespace-pre-line">{newTemplate.bodyText}</div>
                  {newTemplate.footerText && <div className="text-xs text-gray-500 mt-1">{newTemplate.footerText}</div>}
                  {newTemplate.buttons.filter((b) => b.text).length > 0 && (
                    <div className="border-t mt-2 pt-2 flex gap-1 flex-wrap">
                      {newTemplate.buttons.filter((b) => b.text).map((b, i) => <span key={i} className="px-2 py-1 border border-gray-300 rounded text-xs text-blue-600">{b.text}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button onClick={() => createMut.mutate()} disabled={!newTemplate.name || !newTemplate.bodyText || createMut.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
            {createMut.isPending ? "Submitting to Meta…" : "Submit for Approval"}
          </button>
          <p className="text-xs text-muted-foreground">Meta reviews templates in 1-48 hours. UTILITY templates are approved faster.</p>
        </div>
      )}

      {tab === "send" && (
        <div className="max-w-lg space-y-4">
          {sendModal ? (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Send: <code className="font-mono">{sendModal.name}</code></h3>
              <div><label className="text-xs text-muted-foreground block mb-1">To (WhatsApp number)</label><input value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="92XXXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
              {sendParams.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Template Variables</label>
                  {sendParams.map((p, i) => <input key={i} value={p} onChange={(e) => setSendParams((prev) => prev.map((v, j) => j === i ? e.target.value : v))} placeholder={`Variable ${i + 1}`} className="w-full px-3 py-2 border rounded-lg text-sm bg-background mb-1" />)}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setSendModal(null); setTab("list"); }} className="flex-1 px-3 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={() => sendMut.mutate({ template: sendModal, to: sendTo, params: sendParams })} disabled={!sendTo || sendMut.isPending} className="flex-1 px-3 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><Send className="h-4 w-4" />{sendMut.isPending ? "Sending…" : "Send"}</button>
              </div>
              {sendMut.isSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Sent!</div>}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Select a template to send:</p>
              {templates.filter((t) => t.status === "APPROVED").map((t) => (
                <button key={t.id} onClick={() => { setSendModal(t); setSendParams(Array(countParams(renderTemplate(t.components))).fill("")); }} className="block w-full text-left bg-card border rounded-xl p-3 mb-2 hover:border-primary transition-colors">
                  <code className="font-mono text-sm">{t.name}</code>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${CATEGORY_COLORS[t.category]}`}>{t.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
