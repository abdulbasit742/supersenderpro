import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Plus, Send, Save, CheckCircle } from "lucide-react";
import type { PriceAlert } from "@/lib/price-alerts.functions";

export const Route = createFileRoute("/_app/price-alerts")({
  component: PriceAlertsPage,
});

const MOCK_ALERTS: PriceAlert[] = [
  { id: "pa1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", product: "ChatGPT Plus", targetPrice: 3000, currentPrice: 3500, status: "watching", notified: false, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 23 * 86400000).toISOString() },
  { id: "pa2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", product: "Adobe CC", targetPrice: 4000, currentPrice: 3800, status: "triggered", notified: true, notifiedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 16 * 86400000).toISOString() },
  { id: "pa3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", product: "Midjourney Pro", targetPrice: 3500, currentPrice: 4200, status: "watching", notified: false, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 27 * 86400000).toISOString() },
  { id: "pa4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", product: "Netflix Premium", targetPrice: 2000, currentPrice: 2500, status: "watching", notified: false, createdAt: new Date(Date.now() - 86400000).toISOString(), expiresAt: new Date(Date.now() + 29 * 86400000).toISOString() },
];
const MOCK_CONFIG = { isActive: true, checkIntervalHours: 6, alertMessage: "🎉 Khushkhabri! {{product}} ki price aapke target {{targetPrice}} tak aa gayi!\n\nAbhi order karein — reply YES!", maxAlertsPerDay: 3 };
const PRODUCTS = ["ChatGPT Plus","Midjourney Pro","Netflix Premium","Canva Pro","Adobe CC","Spotify Family","LinkedIn Premium"];

const STATUS_COLORS = { watching: "bg-blue-100 text-blue-700", triggered: "bg-green-100 text-green-700", expired: "bg-gray-100 text-gray-500" };

export default function PriceAlertsPage() {
  const [tab, setTab] = useState<"alerts"|"add"|"settings">("alerts");
  const [config, setConfig] = useState(MOCK_CONFIG);
  const [newAlert, setNewAlert] = useState({ whatsapp: "", product: PRODUCTS[0], targetPrice: 0 });
  const qc = useQueryClient();

  const { data: alerts = MOCK_ALERTS } = useQuery({ queryKey: ["price-alerts"], queryFn: async () => { const { getPriceAlerts } = await import("@/lib/price-alerts.functions"); return getPriceAlerts(); }, placeholderData: MOCK_ALERTS, staleTime: 60_000 });

  const sendMut = useMutation({ mutationFn: async (id: string) => { const { sendAlertNow } = await import("@/lib/price-alerts.functions"); return sendAlertNow({ data: { alertId: id } }); } });
  const createMut = useMutation({ mutationFn: async () => { const { createPriceAlert } = await import("@/lib/price-alerts.functions"); return createPriceAlert({ data: { customerId: `c_${Date.now()}`, whatsapp: newAlert.whatsapp, product: newAlert.product, targetPrice: Number(newAlert.targetPrice) } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["price-alerts"] }); setTab("alerts"); } });
  const saveConfigMut = useMutation({ mutationFn: async () => { const { savePriceAlertConfig } = await import("@/lib/price-alerts.functions"); return savePriceAlertConfig({ data: config as unknown as Record<string, unknown> }); } });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> Price Alerts</h1>
          <p className="text-muted-foreground text-sm">Customers set target prices — auto-notify when price drops via WhatsApp</p>
        </div>
        <button onClick={() => setTab("add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Add Alert</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{alerts.filter(a => a.status === "watching").length}</div><div className="text-xs text-muted-foreground">Watching</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{alerts.filter(a => a.status === "triggered").length}</div><div className="text-xs text-green-600">Triggered</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{alerts.filter(a => a.notified).length}</div><div className="text-xs text-muted-foreground">Notified</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["alerts","add","settings"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "alerts" ? "Price Alerts" : t === "add" ? "Add Alert" : "Settings"}</button>)}
      </div>

      {tab === "alerts" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Customer","WhatsApp","Product","Target","Current","Gap","Status","Action"].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(alerts as typeof MOCK_ALERTS).map(a => {
                const gap = a.currentPrice - a.targetPrice;
                return (
                  <tr key={a.id} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-3 font-medium">{a.customerName}</td>
                    <td className="px-3 py-3 font-mono text-xs">{a.whatsapp}</td>
                    <td className="px-3 py-3">{a.product}</td>
                    <td className="px-3 py-3 font-medium text-green-600">PKR {a.targetPrice.toLocaleString()}</td>
                    <td className="px-3 py-3">PKR {a.currentPrice.toLocaleString()}</td>
                    <td className="px-3 py-3"><span className={gap > 0 ? "text-red-500" : "text-green-600"}>{gap > 0 ? `+PKR ${gap}` : `✓ In range`}</span></td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                    <td className="px-3 py-3">
                      {a.status === "triggered" && !a.notified && <button onClick={() => sendMut.mutate(a.id)} disabled={sendMut.isPending} className="flex items-center gap-1 px-2.5 py-1 bg-[#25D366] text-white rounded text-xs"><Send className="h-3 w-3" />Notify</button>}
                      {a.notified && <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="h-3.5 w-3.5" />Notified</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "add" && (
        <div className="max-w-md space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Customer WhatsApp</label><input value={newAlert.whatsapp} onChange={e => setNewAlert(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Product</label><select value={newAlert.product} onChange={e => setNewAlert(p => ({ ...p, product: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{PRODUCTS.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Target Price (PKR)</label><input type="number" value={newAlert.targetPrice} onChange={e => setNewAlert(p => ({ ...p, targetPrice: Number(e.target.value) }))} placeholder="3000" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <button onClick={() => createMut.mutate()} disabled={!newAlert.whatsapp || !newAlert.targetPrice || createMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{createMut.isPending ? "Adding…" : "Add Price Alert"}</button>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-md space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Price Alert System</h3><button onClick={() => setConfig(p => ({ ...p, isActive: !p.isActive }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.isActive ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.isActive ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Check Interval (hours)</label><input type="number" value={config.checkIntervalHours} onChange={e => setConfig(p => ({ ...p, checkIntervalHours: Number(e.target.value) }))} className="w-24 px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Alert Message Template</label><textarea value={config.alertMessage} onChange={e => setConfig(p => ({ ...p, alertMessage: e.target.value }))} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          </div>
          <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2"><Save className="h-4 w-4" />Save Settings</button>
        </div>
      )}
    </div>
  );
}
