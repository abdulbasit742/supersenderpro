import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Smartphone, Plus, Star, Trash2, Wifi, WifiOff, BarChart2 } from "lucide-react";
import type { WAAccount } from "@/lib/multi-wa.functions";

export const Route = createFileRoute("/_app/multi-wa")({
  component: MultiWAPage,
});

const MOCK_ACCOUNTS: WAAccount[] = [
  { id: "wa1", label: "Main Business", phoneNumber: "+92 300 1234567", status: "connected", isPrimary: true, messagesSentToday: 234, totalMessagesSent: 8942, quality: "green", addedAt: new Date(Date.now() - 60 * 86400000).toISOString(), lastUsedAt: new Date(Date.now() - 600000).toISOString() },
  { id: "wa2", label: "Customer Support", phoneNumber: "+92 311 2345678", status: "connected", isPrimary: false, messagesSentToday: 89, totalMessagesSent: 3421, quality: "yellow", addedAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastUsedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "wa3", label: "Bulk Broadcasts", phoneNumber: "+92 321 3456789", status: "disconnected", isPrimary: false, messagesSentToday: 0, totalMessagesSent: 1200, quality: "red", addedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
];

const QUALITY_COLORS = { green: "bg-green-500", yellow: "bg-yellow-400", red: "bg-red-500" };
const QUALITY_LABELS = { green: "Good", yellow: "Fair", red: "Poor" };

export default function MultiWAPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", phoneNumber: "", phoneNumberId: "", wabaId: "", token: "" });
  const qc = useQueryClient();

  const { data: accounts = MOCK_ACCOUNTS } = useQuery({ queryKey: ["wa-accounts"], queryFn: async () => { const { getWAAccounts } = await import("@/lib/multi-wa.functions"); return getWAAccounts(); }, placeholderData: MOCK_ACCOUNTS, staleTime: 60_000 });

  const setPrimaryMut = useMutation({ mutationFn: async (id: string) => { const { setPrimaryAccount } = await import("@/lib/multi-wa.functions"); return setPrimaryAccount({ data: { id } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-accounts"] }) });
  const removeMut = useMutation({ mutationFn: async (id: string) => { const { removeWAAccount } = await import("@/lib/multi-wa.functions"); return removeWAAccount({ data: { id } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-accounts"] }) });
  const addMut = useMutation({ mutationFn: async () => { const { addWAAccount } = await import("@/lib/multi-wa.functions"); return addWAAccount({ data: addForm }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["wa-accounts"] }); setShowAdd(false); setAddForm({ label: "", phoneNumber: "", phoneNumberId: "", wabaId: "", token: "" }); } });

  const totalToday = (accounts as typeof MOCK_ACCOUNTS).reduce((s, a) => s + a.messagesSentToday, 0);
  const totalAll = (accounts as typeof MOCK_ACCOUNTS).reduce((s, a) => s + a.totalMessagesSent, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="h-6 w-6 text-primary" /> Multi-WhatsApp Manager</h1>
          <p className="text-muted-foreground text-sm">Manage multiple WhatsApp numbers from one dashboard</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Add Account</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{accounts.length}</div><div className="text-xs text-muted-foreground">Total Accounts</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{accounts.filter(a => a.status === "connected").length}</div><div className="text-xs text-green-600">Connected</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">{totalToday.toLocaleString()}</div><div className="text-xs text-blue-600">Messages Today</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{totalAll.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Messages</div></div>
      </div>

      {showAdd && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 max-w-lg space-y-3">
          <h3 className="font-semibold">Add WhatsApp Account</h3>
          {[["label","Label","e.g. Support Line"],["phoneNumber","Phone Number","+92 300 1234567"],["phoneNumberId","Phone Number ID (Meta)","From Meta Business Manager"],["wabaId","WABA ID (optional)","WhatsApp Business Account ID"],["token","Access Token (optional)","Meta Cloud API Token"]].map(([key, label, placeholder]) => (
            <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label><input value={(addForm as Record<string, string>)[key]} onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => addMut.mutate()} disabled={!addForm.label || !addForm.phoneNumber || addMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{addMut.isPending ? "Adding…" : "Add Account"}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(accounts as typeof MOCK_ACCOUNTS).map(acc => (
          <div key={acc.id} className={`bg-card border rounded-xl p-4 ${acc.isPrimary ? "border-primary/50 shadow-sm" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0 ${acc.status === "connected" ? "bg-[#25D366]" : "bg-gray-400"}`}>
                  {acc.status === "connected" ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5"><span className="font-semibold">{acc.label}</span>{acc.isPrimary && <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-medium">Primary</span>}<div className={`h-2 w-2 rounded-full ${QUALITY_COLORS[acc.quality]}`} title={`Quality: ${QUALITY_LABELS[acc.quality]}`} /></div>
                  <div className="text-sm text-muted-foreground font-mono">{acc.phoneNumber}</div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Today: <strong className="text-foreground">{acc.messagesSentToday}</strong></span>
                    <span>Total: <strong className="text-foreground">{acc.totalMessagesSent.toLocaleString()}</strong></span>
                    {acc.lastUsedAt && <span>Last: {new Date(acc.lastUsedAt).toLocaleString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!acc.isPrimary && <button onClick={() => setPrimaryMut.mutate(acc.id)} className="flex items-center gap-1 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Star className="h-3 w-3" />Set Primary</button>}
                {!acc.isPrimary && <button onClick={() => removeMut.mutate(acc.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${acc.status === "connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{acc.status === "connected" ? "Connected" : "Disconnected"}</span>
              <span className="text-xs text-muted-foreground">Quality: <span className={`font-medium ${acc.quality === "green" ? "text-green-600" : acc.quality === "yellow" ? "text-yellow-600" : "text-red-600"}`}>{QUALITY_LABELS[acc.quality]}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
