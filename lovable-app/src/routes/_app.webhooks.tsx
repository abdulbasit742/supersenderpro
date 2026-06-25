import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Webhook, Plus, Trash2, Send, Check, AlertCircle, Zap, ExternalLink } from "lucide-react";
import type { WebhookConfig, ZapierTemplate } from "@/lib/webhooks.functions";

export const Route = createFileRoute("/_app/webhooks")({
  component: WebhooksPage,
});

type Tab = "webhooks" | "templates" | "logs";

const MOCK_WEBHOOKS: WebhookConfig[] = [
  { id: "w1", name: "Zapier — New Order", url: "https://hooks.zapier.com/hooks/catch/12345/abcdef/", events: ["order.created", "payment.received"], isActive: true, secret: "sec_abc123", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(), totalFired: 47, totalFailed: 2 },
  { id: "w2", name: "Google Sheets — Customer Log", url: "https://hooks.zapier.com/hooks/catch/12345/ghijkl/", events: ["customer.created", "order.created"], isActive: false, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), totalFired: 12, totalFailed: 0 },
];

const MOCK_TEMPLATES: ZapierTemplate[] = [
  { id: "t1", name: "New Order → Google Sheets", description: "Automatically log every new order to a Google Sheet with customer, product, amount, and date.", events: ["order.created"], zapierUrl: "https://zapier.com/apps/webhooks/integrations/google-sheets" },
  { id: "t2", name: "Payment Received → Slack Alert", description: "Send a Slack message every time a payment is confirmed.", events: ["payment.received"], zapierUrl: "https://zapier.com/apps/webhooks/integrations/slack" },
  { id: "t3", name: "New Customer → CRM", description: "Add new customers to HubSpot, Airtable, or Notion CRM automatically.", events: ["customer.created"], zapierUrl: "https://zapier.com/apps/webhooks/integrations/hubspot" },
  { id: "t4", name: "Churn Alert → Email", description: "Send an email when a customer shows churn risk signals.", events: ["churn.detected"], zapierUrl: "https://zapier.com/apps/webhooks/integrations/gmail" },
  { id: "t5", name: "Low Stock → Reorder", description: "Trigger a purchase order workflow when stock goes below threshold.", events: ["stock.low"], zapierUrl: "https://zapier.com/apps/webhooks/integrations" },
];

const ALL_EVENTS = ["order.created","order.updated","payment.received","customer.created","renewal.due","stock.low","broadcast.sent","churn.detected"] as const;

const MOCK_LOGS = [
  { id: "l1", webhookId: "w1", event: "order.created", status: "success", statusCode: 200, sentAt: new Date(Date.now() - 3600000).toISOString(), durationMs: 234 },
  { id: "l2", webhookId: "w1", event: "payment.received", status: "success", statusCode: 200, sentAt: new Date(Date.now() - 7200000).toISOString(), durationMs: 189 },
  { id: "l3", webhookId: "w1", event: "order.created", status: "failed", statusCode: 500, sentAt: new Date(Date.now() - 14400000).toISOString(), durationMs: 10001, error: "Timeout after 10s" },
];

export default function WebhooksPage() {
  const [tab, setTab] = useState<Tab>("webhooks");
  const [showForm, setShowForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", url: "", events: [] as string[] });
  const [testId, setTestId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; statusCode?: number; error?: string } | null>(null);
  const qc = useQueryClient();

  const { data: webhooks = MOCK_WEBHOOKS } = useQuery({
    queryKey: ["webhooks"], queryFn: async () => { const { getWebhooks } = await import("@/lib/webhooks.functions"); return getWebhooks(); }, placeholderData: MOCK_WEBHOOKS, staleTime: 60_000,
  });
  const { data: templates = MOCK_TEMPLATES } = useQuery({
    queryKey: ["zapier-templates"], queryFn: async () => { const { getZapierTemplates } = await import("@/lib/webhooks.functions"); return getZapierTemplates(); }, placeholderData: MOCK_TEMPLATES, staleTime: 3600_000,
  });

  const saveMut = useMutation({
    mutationFn: async () => { const { saveWebhook } = await import("@/lib/webhooks.functions"); return saveWebhook({ data: { name: newForm.name, url: newForm.url, events: newForm.events } }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); setShowForm(false); setNewForm({ name: "", url: "", events: [] }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { deleteWebhook } = await import("@/lib/webhooks.functions"); return deleteWebhook({ data: { id } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const testMut = useMutation({
    mutationFn: async (id: string) => { setTestId(id); const { testWebhook } = await import("@/lib/webhooks.functions"); return testWebhook({ data: { id } }); },
    onSuccess: (r) => setTestResult(r),
    onSettled: () => setTestId(null),
  });

  const toggleEvent = (event: string) => setNewForm(p => ({ ...p, events: p.events.includes(event) ? p.events.filter(e => e !== event) : [...p.events, event] }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6 text-primary" /> Webhook & Zapier Hub</h1>
          <p className="text-muted-foreground text-sm">Connect SuperSenderPro to any app via webhooks or Zapier integrations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Add Webhook</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 text-center"><div className="text-2xl font-bold text-primary">{webhooks.filter(w => w.isActive).length}</div><div className="text-sm text-muted-foreground">Active Webhooks</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-700">{(webhooks as typeof MOCK_WEBHOOKS).reduce((s, w) => s + (w.totalFired ?? 0), 0)}</div><div className="text-sm text-green-600">Total Fired</div></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-red-700">{(webhooks as typeof MOCK_WEBHOOKS).reduce((s, w) => s + (w.totalFailed ?? 0), 0)}</div><div className="text-sm text-red-600">Failures</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["webhooks","templates","logs"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "webhooks" ? "My Webhooks" : t === "templates" ? "Zapier Templates" : "Delivery Logs"}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 max-w-lg space-y-3">
          <h3 className="font-semibold">New Webhook</h3>
          <div><label className="text-xs text-muted-foreground block mb-1">Name</label><input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Zapier — Google Sheets" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Endpoint URL</label><input value={newForm.url} onChange={e => setNewForm(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.zapier.com/hooks/catch/..." className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Events to Subscribe</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_EVENTS.map(ev => (
                <button key={ev} onClick={() => toggleEvent(ev)} className={`text-left px-2.5 py-1.5 rounded border text-xs transition-colors ${newForm.events.includes(ev) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{ev}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveMut.mutate()} disabled={!newForm.name || !newForm.url || newForm.events.length === 0 || saveMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Saving…" : "Save Webhook"}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="space-y-3">
          {(webhooks as typeof MOCK_WEBHOOKS).map(w => (
            <div key={w.id} className={`bg-card border rounded-xl p-4 ${!w.isActive ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{w.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{w.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mb-2 truncate max-w-sm">{w.url}</p>
                  <div className="flex flex-wrap gap-1 mb-2">{w.events.map(e => <span key={e} className="text-xs bg-secondary px-2 py-0.5 rounded">{e}</span>)}</div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Fired: <strong className="text-foreground">{w.totalFired}</strong></span>
                    <span>Failed: <strong className={w.totalFailed ? "text-red-600" : "text-foreground"}>{w.totalFailed}</strong></span>
                    {w.lastTriggeredAt && <span>Last: {new Date(w.lastTriggeredAt).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => testMut.mutate(w.id)} disabled={testMut.isPending && testId === w.id} className="px-2.5 py-1.5 border rounded text-xs hover:bg-accent flex items-center gap-1"><Send className="h-3 w-3" />Test</button>
                  <button onClick={() => deleteMut.mutate(w.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {testId === w.id && testResult && (
                <div className={`mt-3 rounded-lg p-2.5 text-xs flex items-center gap-2 ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {testResult.ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {testResult.ok ? `Success! HTTP ${testResult.statusCode}` : `Failed: ${testResult.error}`}
                </div>
              )}
            </div>
          ))}
          {webhooks.length === 0 && <div className="text-center py-12 text-muted-foreground"><Webhook className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No webhooks yet. Add one to start connecting apps.</p></div>}
        </div>
      )}

      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(templates as typeof MOCK_TEMPLATES).map(t => (
            <div key={t.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-orange-500" /><span className="font-semibold text-sm">{t.name}</span></div>
                <a href={t.zapierUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-accent rounded text-muted-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">{t.events.map(e => <span key={e} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{e}</span>)}</div>
              <a href={t.zapierUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600">Use This Template →</a>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Webhook","Event","Status","Code","Duration","Time"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {MOCK_LOGS.map(log => (
                <tr key={log.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{(webhooks as typeof MOCK_WEBHOOKS).find(w => w.id === log.webhookId)?.name ?? log.webhookId}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.event}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${log.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{log.status}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{log.statusCode}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.durationMs}ms</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.sentAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
