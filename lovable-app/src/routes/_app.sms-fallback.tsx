import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare, Save, CheckCircle, XCircle, Send } from "lucide-react";

export const Route = createFileRoute("/_app/sms-fallback")({
  component: SmsFallbackPage,
});

type Tab = "settings" | "logs" | "test";

interface SmsLog {
  id: string;
  waNumber: string;
  waMsgId: string;
  smsStatus: "sent" | "delivered" | "failed";
  smsCost: number;
  reason: string;
  sentAt: string;
}

const MOCK_LOGS: SmsLog[] = [
  { id: "s1", waNumber: "03001234567", waMsgId: "wamid.abc123", smsStatus: "delivered", smsCost: 1.2, reason: "WA undelivered after 30min", sentAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "s2", waNumber: "03111234567", waMsgId: "wamid.def456", smsStatus: "sent", smsCost: 1.2, reason: "WA number invalid", sentAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "s3", waNumber: "03211234567", waMsgId: "wamid.ghi789", smsStatus: "failed", smsCost: 0, reason: "SMS provider error", sentAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "s4", waNumber: "03321234567", waMsgId: "wamid.jkl012", smsStatus: "delivered", smsCost: 1.2, reason: "WA undelivered after 30min", sentAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

const STATUS_COLORS = { sent: "bg-blue-100 text-blue-700", delivered: "bg-green-100 text-green-700", failed: "bg-red-100 text-red-700" };

export default function SmsFallbackPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const [config, setConfig] = useState({ isActive: true, provider: "telenor-djuice", apiKey: "", senderId: "SuperSender", fallbackAfterMins: 30, onlyIfUndelivered: true, onlyForCritical: false });
  const [testNumber, setTestNumber] = useState("");
  const [testMsg, setTestMsg] = useState("Test SMS from SuperSender Pro");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleTest = () => { setTestResult(`Demo: SMS queued to ${testNumber || "03XXXXXXXXX"} via ${config.provider}. In production, this sends a real SMS.`); };

  const totalSent = MOCK_LOGS.filter(l => l.smsStatus !== "failed").length;
  const totalCost = MOCK_LOGS.reduce((s, l) => s + l.smsCost, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" /> SMS Fallback</h1>
        <p className="text-muted-foreground text-sm">Auto-send SMS when WhatsApp delivery fails — never miss a customer</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">{MOCK_LOGS.length}</div><div className="text-xs text-muted-foreground">Total Fallbacks</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">{totalSent}</div><div className="text-xs text-green-600">SMS Delivered</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">PKR {totalCost.toFixed(2)}</div><div className="text-xs text-muted-foreground">Total SMS Cost</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["settings","logs","test"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "settings" ? "Configuration" : t === "logs" ? "SMS Logs" : "Test SMS"}</button>)}
      </div>

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between"><div><h3 className="font-semibold">SMS Fallback</h3><p className="text-xs text-muted-foreground">Send SMS when WA fails</p></div><button onClick={() => setConfig(p => ({ ...p, isActive: !p.isActive }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.isActive ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.isActive ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>

            <div><label className="text-xs text-muted-foreground block mb-1">SMS Provider</label>
              <select value={config.provider} onChange={e => setConfig(p => ({ ...p, provider: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                <option value="telenor-djuice">Telenor / Djuice</option>
                <option value="jazz">Jazz</option>
                <option value="ufone">Ufone</option>
                <option value="twilio">Twilio (International)</option>
                <option value="eocean">EOcean Pakistan</option>
              </select>
            </div>

            <div><label className="text-xs text-muted-foreground block mb-1">API Key</label><input type="password" value={config.apiKey} onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value }))} placeholder="Enter your SMS provider API key" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Sender ID</label><input value={config.senderId} onChange={e => setConfig(p => ({ ...p, senderId: e.target.value }))} placeholder="SuperSender" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Fallback after (minutes)</label><input type="number" min={5} max={60} value={config.fallbackAfterMins} onChange={e => setConfig(p => ({ ...p, fallbackAfterMins: Number(e.target.value) }))} className="w-32 px-3 py-2 border rounded-lg text-sm bg-background" /></div>

            <div className="space-y-2 pt-2 border-t">
              {[["onlyIfUndelivered","Only trigger if WA message shows undelivered"],["onlyForCritical","Only for critical messages (orders, credentials)"]].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={(config as Record<string, boolean>)[key]} onChange={e => setConfig(p => ({ ...p, [key]: e.target.checked }))} className="rounded" /><span className="text-sm">{label}</span></label>
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2">{saved ? <><CheckCircle className="h-4 w-4" />Saved!</> : <><Save className="h-4 w-4" />Save Configuration</>}</button>
        </div>
      )}

      {tab === "logs" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["WA Number","WA Msg ID","Reason","SMS Status","Cost","Time"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {MOCK_LOGS.map(l => (
                <tr key={l.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{l.waNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[120px]">{l.waMsgId}</td>
                  <td className="px-4 py-3 text-xs">{l.reason}</td>
                  <td className="px-4 py-3"><span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${STATUS_COLORS[l.smsStatus]}`}>{l.smsStatus === "delivered" ? <CheckCircle className="h-3 w-3" /> : l.smsStatus === "failed" ? <XCircle className="h-3 w-3" /> : null}{l.smsStatus}</span></td>
                  <td className="px-4 py-3 text-xs">{l.smsCost > 0 ? `PKR ${l.smsCost}` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.sentAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "test" && (
        <div className="max-w-md space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Test SMS Fallback</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Phone Number</label><input value={testNumber} onChange={e => setTestNumber(e.target.value)} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Message</label><textarea value={testMsg} onChange={e => setTestMsg(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            <button onClick={handleTest} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Send className="h-4 w-4" />Send Test SMS</button>
            {testResult && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">{testResult}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
