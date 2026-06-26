import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldOff, Plus, Trash2, Search, AlertTriangle } from "lucide-react";
import type { BlacklistEntry, BlacklistReason } from "@/lib/blacklist.functions";

export const Route = createFileRoute("/_app/blacklist")({
  component: BlacklistPage,
});

const MOCK_ENTRIES: BlacklistEntry[] = [
  { id: "bl1", whatsapp: "03001112233", name: "Fake Ahmed", reason: "fraud", notes: "Ordered twice, never paid. Total loss PKR 9000.", addedBy: "Imran", addedAt: new Date(Date.now() - 14 * 86400000).toISOString(), orderCount: 2, totalLoss: 9000 },
  { id: "bl2", whatsapp: "03112223344", reason: "chargeback", notes: "Disputed JazzCash payment after product delivered.", addedBy: "Ayesha", addedAt: new Date(Date.now() - 7 * 86400000).toISOString(), orderCount: 1, totalLoss: 3500 },
  { id: "bl3", whatsapp: "03223334455", reason: "spam", notes: "Sending bulk spam messages to our WA number.", addedBy: "System", addedAt: new Date(Date.now() - 3 * 86400000).toISOString(), orderCount: 0, totalLoss: 0 },
  { id: "bl4", whatsapp: "03334445566", name: "Bilal Scammer", reason: "fraud", notes: "Shared fake payment screenshots 4 times.", addedBy: "Usman", addedAt: new Date(Date.now() - 30 * 86400000).toISOString(), orderCount: 4, totalLoss: 14000 },
];

const REASON_LABELS: Record<BlacklistReason, string> = { fraud: "Fraud / Scam", chargeback: "Chargeback", spam: "Spam / Fake", abusive: "Abusive", duplicate: "Duplicate", other: "Other" };
const REASON_COLORS: Record<BlacklistReason, string> = { fraud: "bg-red-100 text-red-800", chargeback: "bg-orange-100 text-orange-700", spam: "bg-yellow-100 text-yellow-700", abusive: "bg-purple-100 text-purple-700", duplicate: "bg-blue-100 text-blue-700", other: "bg-gray-100 text-gray-600" };

export default function BlacklistPage() {
  const [newEntry, setNewEntry] = useState({ whatsapp: "", name: "", reason: "fraud" as BlacklistReason, notes: "" });
  const [checkNumber, setCheckNumber] = useState("");
  const [checkResult, setCheckResult] = useState<{ isBlacklisted: boolean; entry: BlacklistEntry | null } | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: entries = MOCK_ENTRIES } = useQuery({ queryKey: ["blacklist"], queryFn: async () => { const { getBlacklist } = await import("@/lib/blacklist.functions"); return getBlacklist(); }, placeholderData: MOCK_ENTRIES, staleTime: 60_000 });

  const addMut = useMutation({ mutationFn: async () => { const { addToBlacklist } = await import("@/lib/blacklist.functions"); return addToBlacklist({ data: { ...newEntry } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["blacklist"] }); setNewEntry({ whatsapp: "", name: "", reason: "fraud", notes: "" }); } });
  const removeMut = useMutation({ mutationFn: async (entryId: string) => { const { removeFromBlacklist } = await import("@/lib/blacklist.functions"); await removeFromBlacklist({ data: { entryId } }); return entryId; }, onSuccess: (id) => setRemoved(p => new Set([...p, id])) });
  const checkMut = useMutation({ mutationFn: async () => { const { checkBlacklist } = await import("@/lib/blacklist.functions"); return checkBlacklist({ data: { whatsapp: checkNumber } }); }, onSuccess: (r) => setCheckResult(r as typeof checkResult) });

  const visible = (entries as typeof MOCK_ENTRIES).filter(e => !removed.has(e.id));
  const totalLoss = visible.reduce((s, e) => s + e.totalLoss, 0);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldOff className="h-6 w-6 text-red-500" /> Blacklist Manager</h1><p className="text-muted-foreground text-sm">Block fraudsters, scammers, chargebacks — protect your business from repeat offenders</p></div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-700">{visible.length}</div><div className="text-xs text-red-600">Blocked Numbers</div></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-red-700">PKR {(totalLoss/1000).toFixed(0)}K</div><div className="text-xs text-red-600">Total Loss Prevented</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{visible.filter(e => e.reason === "fraud").length}</div><div className="text-xs text-muted-foreground">Fraud Cases</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {visible.map(entry => (
            <div key={entry.id} className="bg-card border-l-4 border-l-red-400 border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-mono font-semibold">{entry.whatsapp}</span>{entry.name && <span className="text-sm text-muted-foreground">({entry.name})</span>}<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[entry.reason]}`}>{REASON_LABELS[entry.reason]}</span></div>
                  <div className="text-sm text-muted-foreground">{entry.notes}</div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground"><span>Added by {entry.addedBy}</span><span>{new Date(entry.addedAt).toLocaleDateString()}</span>{entry.totalLoss > 0 && <span className="text-red-600">Loss: PKR {entry.totalLoss.toLocaleString()}</span>}</div>
                </div></div>
                <button onClick={() => removeMut.mutate(entry.id)} disabled={removeMut.isPending} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><Search className="h-4 w-4" />Check Number</h3>
            <input value={checkNumber} onChange={e => setCheckNumber(e.target.value)} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" />
            <button onClick={() => checkMut.mutate()} disabled={!checkNumber || checkMut.isPending} className="w-full px-3 py-2 border rounded-lg text-sm hover:bg-accent">{checkMut.isPending ? "Checking…" : "Check"}</button>
            {checkResult && <div className={`rounded-lg p-2 text-sm text-center font-medium ${checkResult.isBlacklisted ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>{checkResult.isBlacklisted ? `🚫 BLOCKED — ${REASON_LABELS[checkResult.entry!.reason]}` : "✓ Number is clean"}</div>}
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" />Add to Blacklist</h3>
            <input value={newEntry.whatsapp} onChange={e => setNewEntry(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" />
            <input value={newEntry.name} onChange={e => setNewEntry(p => ({ ...p, name: e.target.value }))} placeholder="Name (optional)" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />
            <select value={newEntry.reason} onChange={e => setNewEntry(p => ({ ...p, reason: e.target.value as BlacklistReason }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{Object.entries(REASON_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
            <textarea value={newEntry.notes} onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes about this case…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
            <button onClick={() => addMut.mutate()} disabled={!newEntry.whatsapp || !newEntry.notes || addMut.isPending} className="w-full px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium">{addMut.isPending ? "Adding…" : "Block Number"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
