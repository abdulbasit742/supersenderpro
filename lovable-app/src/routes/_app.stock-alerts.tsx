import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Send, Plus, Users } from "lucide-react";
import type { StockArrivalAlert, WaitlistEntry } from "@/lib/stock-alerts.functions";

export const Route = createFileRoute("/_app/stock-alerts")({
  component: StockAlertsPage,
});

type Tab = "alerts" | "waitlist" | "create";

const MOCK_ALERTS: StockArrivalAlert[] = [
  { id: "sa1", productName: "ChatGPT Plus", stockAdded: 50, notifyWaitlist: true, notifyAll: false, targetSegment: "waitlist", messageTemplate: "🎉 {{product}} ka naya stock aa gaya! {{qty}} slots available. Order karein!", autoSend: true, sentCount: 23, sentAt: new Date(Date.now() - 86400000).toISOString(), status: "sent", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "sa2", productName: "Adobe CC", stockAdded: 20, notifyWaitlist: true, notifyAll: true, targetSegment: "all", messageTemplate: "🆕 {{product}} stock available! Limited slots — PKR {{price}}. Reply: BUY", autoSend: false, status: "draft", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "sa3", productName: "Midjourney Pro", stockAdded: 10, notifyWaitlist: true, notifyAll: false, targetSegment: "waitlist", messageTemplate: "⚡ {{product}} back in stock! {{qty}} slots. Quick reply: YES", autoSend: true, sentCount: 8, sentAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: "sent", createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
];
const MOCK_WAITLIST: WaitlistEntry[] = [
  { id: "wl1", productName: "ChatGPT Plus", customerName: "Ahmed Khan", whatsapp: "03001234567", requestedAt: new Date(Date.now() - 3 * 86400000).toISOString(), notified: true },
  { id: "wl2", productName: "Adobe CC", customerName: "Sara Ali", whatsapp: "03111234567", requestedAt: new Date(Date.now() - 2 * 86400000).toISOString(), notified: false },
  { id: "wl3", productName: "Adobe CC", customerName: "Bilal Raza", whatsapp: "03211234567", requestedAt: new Date(Date.now() - 86400000).toISOString(), notified: false },
  { id: "wl4", productName: "Midjourney Pro", customerName: "Fatima Noor", whatsapp: "03321234567", requestedAt: new Date(Date.now() - 4 * 86400000).toISOString(), notified: true },
  { id: "wl5", productName: "Spotify Family", customerName: "Hassan Malik", whatsapp: "03421234567", requestedAt: new Date(Date.now() - 5 * 86400000).toISOString(), notified: false },
];

const STATUS_COLORS = { sent: "bg-green-100 text-green-700", draft: "bg-yellow-100 text-yellow-700", pending: "bg-blue-100 text-blue-700" };

export default function StockAlertsPage() {
  const [tab, setTab] = useState<Tab>("alerts");
  const [newAlert, setNewAlert] = useState({ productName: "", stockAdded: "", messageTemplate: "🎉 {{product}} ka naya stock aa gaya! {{qty}} slots available. Abhi order karein!", notifyWaitlist: true, notifyAll: false, autoSend: true });
  const [filterProduct, setFilterProduct] = useState("all");
  const qc = useQueryClient();

  const { data: alerts = MOCK_ALERTS } = useQuery({ queryKey: ["stock-alerts"], queryFn: async () => { const { getStockAlerts } = await import("@/lib/stock-alerts.functions"); return getStockAlerts(); }, placeholderData: MOCK_ALERTS, staleTime: 30_000 });
  const { data: waitlist = MOCK_WAITLIST } = useQuery({ queryKey: ["waitlist"], queryFn: async () => { const { getWaitlist } = await import("@/lib/stock-alerts.functions"); return getWaitlist(); }, placeholderData: MOCK_WAITLIST, staleTime: 30_000 });

  const sendMut = useMutation({ mutationFn: async (alertId: string) => { const { sendStockAlert } = await import("@/lib/stock-alerts.functions"); return sendStockAlert({ data: { alertId } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["stock-alerts"] }) });
  const createMut = useMutation({ mutationFn: async () => { const { createStockAlert } = await import("@/lib/stock-alerts.functions"); return createStockAlert({ data: { productName: newAlert.productName, stockAdded: +newAlert.stockAdded, messageTemplate: newAlert.messageTemplate, notifyWaitlist: newAlert.notifyWaitlist, notifyAll: newAlert.notifyAll, autoSend: newAlert.autoSend } }); }, onSuccess: () => { setTab("alerts"); setNewAlert(p => ({ ...p, productName: "", stockAdded: "" })); } });

  const uniqueProducts = ["all", ...Array.from(new Set((waitlist as typeof MOCK_WAITLIST).map(w => w.productName)))];
  const filteredWaitlist = (waitlist as typeof MOCK_WAITLIST).filter(w => filterProduct === "all" || w.productName === filterProduct);
  const pending = (waitlist as typeof MOCK_WAITLIST).filter(w => !w.notified).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> Stock Arrival Alerts</h1><p className="text-muted-foreground text-sm">Notify waiting customers the moment new stock arrives — auto-blast waitlists</p></div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />New Alert</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-700">{pending}</div><div className="text-xs text-orange-600">Waiting to be Notified</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{(alerts as typeof MOCK_ALERTS).filter(a => a.status === "sent").reduce((s, a) => s + (a.sentCount ?? 0), 0)}</div><div className="text-xs text-green-600">Notifications Sent</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{(waitlist as typeof MOCK_WAITLIST).length}</div><div className="text-xs text-muted-foreground">Waitlist Entries</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["alerts","waitlist","create"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "create" ? "Create Alert" : t === "waitlist" ? `Waitlist (${pending} pending)` : "Alert History"}</button>)}
      </div>

      {tab === "alerts" && (
        <div className="space-y-3">
          {(alerts as typeof MOCK_ALERTS).map(alert => (
            <div key={alert.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{alert.productName}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[alert.status]}`}>{alert.status}</span>{alert.autoSend && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Auto</span>}</div>
                  <div className="text-xs text-muted-foreground mb-1">Stock Added: {alert.stockAdded} units · Target: {alert.targetSegment}</div>
                  <div className="text-xs bg-muted/40 rounded p-1.5 font-mono">{alert.messageTemplate}</div>
                  {alert.sentAt && <div className="text-xs text-muted-foreground mt-1">{alert.sentCount} sent · {new Date(alert.sentAt).toLocaleString()}</div>}
                </div>
                {alert.status === "draft" && <button onClick={() => sendMut.mutate(alert.id)} disabled={sendMut.isPending} className="flex items-center gap-1 px-3 py-1.5 bg-[#25D366] text-white rounded text-xs shrink-0"><Send className="h-3.5 w-3.5" />Send Now</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "waitlist" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">{uniqueProducts.map(p => <button key={p} onClick={() => setFilterProduct(p)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterProduct === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{p === "all" ? "All Products" : p}</button>)}</div>
          {filteredWaitlist.map(entry => (
            <div key={entry.id} className={`bg-card border rounded-xl p-3 flex items-center justify-between gap-3 ${entry.notified ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3"><Users className="h-4 w-4 text-muted-foreground shrink-0" /><div><div className="font-medium text-sm">{entry.customerName}</div><div className="text-xs text-muted-foreground">{entry.whatsapp} · {entry.productName} · waiting since {new Date(entry.requestedAt).toLocaleDateString()}</div></div></div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${entry.notified ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{entry.notified ? "Notified" : "Waiting"}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-lg space-y-3 bg-card border rounded-xl p-4">
          <h3 className="font-semibold">Create Stock Alert</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground block mb-1">Product Name</label><input value={newAlert.productName} onChange={e => setNewAlert(p => ({ ...p, productName: e.target.value }))} placeholder="ChatGPT Plus" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Stock Added</label><input type="number" value={newAlert.stockAdded} onChange={e => setNewAlert(p => ({ ...p, stockAdded: e.target.value }))} placeholder="50" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">Message Template (use {`{{product}}`}, {`{{qty}}`})</label><textarea value={newAlert.messageTemplate} onChange={e => setNewAlert(p => ({ ...p, messageTemplate: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newAlert.notifyWaitlist} onChange={e => setNewAlert(p => ({ ...p, notifyWaitlist: e.target.checked }))} />Notify Waitlist Customers</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newAlert.notifyAll} onChange={e => setNewAlert(p => ({ ...p, notifyAll: e.target.checked }))} />Blast to All Customers</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newAlert.autoSend} onChange={e => setNewAlert(p => ({ ...p, autoSend: e.target.checked }))} />Auto-send immediately</label>
          </div>
          <button onClick={() => createMut.mutate()} disabled={!newAlert.productName || !newAlert.stockAdded || createMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{createMut.isPending ? "Creating…" : "Create Alert"}</button>
        </div>
      )}
    </div>
  );
}
