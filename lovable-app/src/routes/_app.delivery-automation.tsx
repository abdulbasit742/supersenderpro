import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PackageCheck, Send, Plus, Save, Check, Eye, EyeOff } from "lucide-react";
import type { DeliveryTemplate, DeliveryLog, DeliveryConfig } from "@/lib/delivery-automation.functions";

export const Route = createFileRoute("/_app/delivery-automation")({
  component: DeliveryAutomationPage,
});

type Tab = "templates" | "send" | "logs" | "settings";

const MOCK_TEMPLATES: DeliveryTemplate[] = [
  { id: "dt1", productName: "ChatGPT Plus", credentialFields: ["email", "password"], messageTemplate: "Assalam Alaikum {{name}}! 🎉\n\nYour *ChatGPT Plus* is ready!\n\n📧 Email: {{email}}\n🔑 Password: {{password}}\n\n⚠️ Keep safe!\n\n_SuperSender Pro_", isActive: true, autoSendOnPayment: true, createdAt: new Date().toISOString() },
  { id: "dt2", productName: "Claude Pro", credentialFields: ["email", "password", "license_key"], messageTemplate: "Your Claude Pro credentials are ready!", isActive: true, autoSendOnPayment: true, createdAt: new Date().toISOString() },
];
const MOCK_LOGS: DeliveryLog[] = [
  { id: "dl1", orderId: "o1", customerName: "Ahmed Khan", whatsapp: "03001234567", product: "ChatGPT Plus", credentials: { email: "user@example.com", password: "Pass123!" }, status: "sent", sentAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "dl2", orderId: "o2", customerName: "Sara Ali", whatsapp: "03111234567", product: "Claude Pro", credentials: {}, status: "pending" },
];
const MOCK_CONFIG: DeliveryConfig = { autoDeliverOnPayment: true, deliveryDelayMinutes: 0, retryOnFailure: true, maxRetries: 3, defaultMessage: "Assalam Alaikum {{name}}! Your {{product}} credentials:\n\n{{credentials}}\n\n_SuperSender Pro_" };

const STATUS_COLORS = { sent: "bg-green-100 text-green-700", failed: "bg-red-100 text-red-700", pending: "bg-yellow-100 text-yellow-700" };

export default function DeliveryAutomationPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [showCreds, setShowCreds] = useState<Record<string, boolean>>({});
  const [sendForm, setSendForm] = useState({ whatsapp: "", customerName: "", product: "ChatGPT Plus", credentials: {} as Record<string, string>, templateId: "" });
  const [config, setConfig] = useState<DeliveryConfig>(MOCK_CONFIG);
  const [newTemplate, setNewTemplate] = useState({ productName: "", fields: "email,password", message: "" });
  const qc = useQueryClient();

  const { data: templates = MOCK_TEMPLATES } = useQuery({ queryKey: ["delivery-templates"], queryFn: async () => { const { getDeliveryTemplates } = await import("@/lib/delivery-automation.functions"); return getDeliveryTemplates(); }, placeholderData: MOCK_TEMPLATES, staleTime: 300_000 });
  const { data: logs = MOCK_LOGS } = useQuery({ queryKey: ["delivery-logs"], queryFn: async () => { const { getDeliveryLogs } = await import("@/lib/delivery-automation.functions"); return getDeliveryLogs(); }, placeholderData: MOCK_LOGS, staleTime: 30_000 });
  const { data: savedConfig = MOCK_CONFIG } = useQuery({ queryKey: ["delivery-config"], queryFn: async () => { const { getDeliveryConfig } = await import("@/lib/delivery-automation.functions"); return getDeliveryConfig(); }, placeholderData: MOCK_CONFIG, staleTime: 300_000 });

  const selectedTemplate = templates.find(t => t.productName === sendForm.product);

  const sendMut = useMutation({
    mutationFn: async () => { const { sendCredentials } = await import("@/lib/delivery-automation.functions"); return sendCredentials({ data: { whatsapp: sendForm.whatsapp, customerName: sendForm.customerName, product: sendForm.product, credentials: sendForm.credentials } }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["delivery-logs"] }); setSendForm(p => ({ ...p, whatsapp: "", customerName: "", credentials: {} })); },
  });

  const saveConfigMut = useMutation({
    mutationFn: async () => { const { saveDeliveryConfig } = await import("@/lib/delivery-automation.functions"); return saveDeliveryConfig({ data: config as unknown as Record<string, unknown> }); },
  });

  const credFields = selectedTemplate?.credentialFields ?? ["email", "password"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><PackageCheck className="h-6 w-6 text-primary" /> Digital Delivery Automation</h1>
        <p className="text-muted-foreground text-sm">Auto-send credentials via WhatsApp when payment is confirmed — zero manual work</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[{ label: "Total Deliveries", value: logs.length }, { label: "Sent Today", value: logs.filter(l => l.status === "sent").length }, { label: "Pending", value: logs.filter(l => l.status === "pending").length }, { label: "Templates", value: templates.length }].map(({ label, value }) => (
          <div key={label} className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {(["templates","send","logs","settings"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "templates" ? "Templates" : t === "send" ? "Send Now" : t === "logs" ? "Delivery Logs" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="space-y-4">
          {templates.map(t => (
            <div key={t.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><span className="font-semibold">{t.productName}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t.isActive ? "Active" : "Inactive"}</span>{t.autoSendOnPayment && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Auto-send</span>}</div>
              </div>
              <div className="flex gap-1 mb-2">{t.credentialFields.map(f => <span key={f} className="text-xs bg-secondary px-2 py-0.5 rounded font-mono">{f}</span>)}</div>
              <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap font-sans text-muted-foreground">{t.messageTemplate}</pre>
            </div>
          ))}
          <div className="bg-card border-2 border-dashed rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> New Template</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Product Name</label><input value={newTemplate.productName} onChange={e => setNewTemplate(p => ({ ...p, productName: e.target.value }))} placeholder="e.g. Netflix Premium" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Credential Fields (comma-separated)</label><input value={newTemplate.fields} onChange={e => setNewTemplate(p => ({ ...p, fields: e.target.value }))} placeholder="email, password, pin" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Message Template</label><textarea value={newTemplate.message} onChange={e => setNewTemplate(p => ({ ...p, message: e.target.value }))} rows={4} placeholder="Use {{name}}, {{product}}, {{email}}, {{password}} etc." className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Save Template</button>
          </div>
        </div>
      )}

      {tab === "send" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Send Credentials Manually</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Customer Name</label><input value={sendForm.customerName} onChange={e => setSendForm(p => ({ ...p, customerName: e.target.value }))} placeholder="Ahmed Khan" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={sendForm.whatsapp} onChange={e => setSendForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Product</label>
              <select value={sendForm.product} onChange={e => setSendForm(p => ({ ...p, product: e.target.value, credentials: {} }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                {templates.map(t => <option key={t.id} value={t.productName}>{t.productName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">Credentials</label>
              {credFields.map(field => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs font-mono w-28 shrink-0 text-muted-foreground">{field}:</span>
                  <input value={sendForm.credentials[field] ?? ""} onChange={e => setSendForm(p => ({ ...p, credentials: { ...p.credentials, [field]: e.target.value } }))} placeholder={field === "password" ? "Enter password" : `Enter ${field}`} className="flex-1 px-2.5 py-1.5 border rounded text-sm bg-background font-mono" />
                </div>
              ))}
            </div>
            <button onClick={() => sendMut.mutate()} disabled={!sendForm.whatsapp || !sendForm.customerName || sendMut.isPending} className="w-full px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><Send className="h-4 w-4" />{sendMut.isPending ? "Sending…" : "Send Credentials via WhatsApp"}</button>
            {sendMut.isSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2"><Check className="h-4 w-4" />Credentials sent!</div>}
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Customer","Product","Credentials","Status","Sent At"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3"><div className="font-medium">{log.customerName}</div><div className="text-xs text-muted-foreground font-mono">{log.whatsapp}</div></td>
                  <td className="px-4 py-3">{log.product}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowCreds(p => ({ ...p, [log.id]: !p[log.id] }))} className="p-1 hover:bg-accent rounded">{showCreds[log.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                      {showCreds[log.id] ? <span className="text-xs font-mono">{Object.values(log.credentials).join(" / ")}</span> : <span className="text-xs text-muted-foreground">••••••</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status]}`}>{log.status}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-md space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Automation Settings</h3>
            <div className="flex items-center justify-between"><span className="text-sm">Auto-deliver on payment</span><button onClick={() => setConfig(p => ({ ...p, autoDeliverOnPayment: !p.autoDeliverOnPayment }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.autoDeliverOnPayment ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.autoDeliverOnPayment ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            <div className="flex items-center gap-3"><input type="number" value={config.deliveryDelayMinutes} onChange={e => setConfig(p => ({ ...p, deliveryDelayMinutes: Number(e.target.value) }))} className="w-20 px-2 py-1.5 border rounded text-sm bg-background" /><span className="text-sm text-muted-foreground">minute delay after payment</span></div>
            <div className="flex items-center justify-between"><span className="text-sm">Retry on failure</span><button onClick={() => setConfig(p => ({ ...p, retryOnFailure: !p.retryOnFailure }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.retryOnFailure ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.retryOnFailure ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
          </div>
          <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />{saveConfigMut.isPending ? "Saving…" : "Save Settings"}</button>
        </div>
      )}
    </div>
  );
}
