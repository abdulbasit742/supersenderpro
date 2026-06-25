import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Plus, Send, Trash2, Users } from "lucide-react";
import type { CustomerSegment } from "@/lib/segments.functions";

export const Route = createFileRoute("/_app/segments")({
  component: SegmentsPage,
});

const MOCK_SEGMENTS: CustomerSegment[] = [
  { id: "seg1", name: "VIP Customers", description: "High-value, frequent buyers", color: "#f59e0b", conditions: [{ field: "total_spent", op: "gt", value: 20000 }], logic: "AND", customerCount: 34, isSystem: true, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg2", name: "At-Risk", description: "No order in 30+ days", color: "#ef4444", conditions: [{ field: "last_order_days", op: "gt", value: 30 }], logic: "AND", customerCount: 67, isSystem: true, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg3", name: "New Customers", description: "First order in last 7 days", color: "#22c55e", conditions: [{ field: "order_count", op: "eq", value: 1 }], logic: "AND", customerCount: 18, isSystem: true, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg4", name: "ChatGPT Buyers", description: "Bought ChatGPT Plus", color: "#3b82f6", conditions: [{ field: "product", op: "contains", value: "ChatGPT" }], logic: "AND", customerCount: 89, isSystem: false, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg5", name: "Dormant", description: "No order in 60+ days", color: "#6b7280", conditions: [{ field: "last_order_days", op: "gt", value: 60 }], logic: "AND", customerCount: 23, isSystem: true, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
];

const FIELDS = ["last_order_days","total_spent","order_count","product","plan","status","city","churn_risk"];
const OPS: Record<string, string> = { gt: ">", lt: "<", eq: "=", contains: "contains", not_contains: "not contains", in: "in" };

export default function SegmentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<CustomerSegment | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [newSeg, setNewSeg] = useState({ name: "", description: "", color: "#3b82f6", conditions: [{ field: "last_order_days", op: "gt", value: "30" }], logic: "AND" as const });
  const qc = useQueryClient();

  const { data: segments = MOCK_SEGMENTS } = useQuery({ queryKey: ["segments"], queryFn: async () => { const { getSegments } = await import("@/lib/segments.functions"); return getSegments(); }, placeholderData: MOCK_SEGMENTS, staleTime: 60_000 });

  const saveMut = useMutation({ mutationFn: async () => { const { saveSegment } = await import("@/lib/segments.functions"); return saveSegment({ data: { ...newSeg, conditions: newSeg.conditions } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["segments"] }); setShowCreate(false); } });
  const deleteMut = useMutation({ mutationFn: async (id: string) => { const { deleteSegment } = await import("@/lib/segments.functions"); return deleteSegment({ data: { id } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["segments"] }) });
  const broadcastMut = useMutation({ mutationFn: async () => { const { broadcastToSegment } = await import("@/lib/segments.functions"); return broadcastToSegment({ data: { segmentId: broadcastTarget?.id ?? "", message: broadcastMsg } }); }, onSuccess: () => { setBroadcastTarget(null); setBroadcastMsg(""); } });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6 text-primary" /> Customer Segments</h1>
          <p className="text-muted-foreground text-sm">Auto-group customers by behavior, send targeted broadcasts to each segment</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> New Segment</button>
      </div>

      {broadcastTarget && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Broadcast to: <span style={{ color: broadcastTarget.color }}>{broadcastTarget.name}</span> ({broadcastTarget.customerCount} customers)</h3>
          <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} rows={3} placeholder="Enter your message… use {{name}} for personalization" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
          <div className="flex gap-2">
            <button onClick={() => broadcastMut.mutate()} disabled={!broadcastMsg.trim() || broadcastMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50"><Send className="h-4 w-4" />{broadcastMut.isPending ? "Sending…" : `Send to ${broadcastTarget.customerCount} customers`}</button>
            <button onClick={() => setBroadcastTarget(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
          {broadcastMut.isSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-sm text-green-700">Broadcast queued for {broadcastTarget.customerCount} customers!</div>}
        </div>
      )}

      {showCreate && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 space-y-3 max-w-2xl">
          <h3 className="font-semibold">New Segment</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Name</label><input value={newSeg.name} onChange={e => setNewSeg(p => ({ ...p, name: e.target.value }))} placeholder="e.g. High Value Buyers" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Color</label><input type="color" value={newSeg.color} onChange={e => setNewSeg(p => ({ ...p, color: e.target.value }))} className="h-10 w-full rounded-lg border cursor-pointer" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">Description</label><input value={newSeg.description} onChange={e => setNewSeg(p => ({ ...p, description: e.target.value }))} placeholder="Short description" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground block">Conditions</label>
            {newSeg.conditions.map((cond, i) => (
              <div key={i} className="flex gap-2">
                <select value={cond.field} onChange={e => setNewSeg(p => ({ ...p, conditions: p.conditions.map((c, j) => j === i ? { ...c, field: e.target.value } : c) }))} className="flex-1 px-2 py-1.5 border rounded text-xs bg-background">{FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g," ")}</option>)}</select>
                <select value={cond.op} onChange={e => setNewSeg(p => ({ ...p, conditions: p.conditions.map((c, j) => j === i ? { ...c, op: e.target.value } : c) }))} className="w-28 px-2 py-1.5 border rounded text-xs bg-background">{Object.entries(OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input value={String(cond.value)} onChange={e => setNewSeg(p => ({ ...p, conditions: p.conditions.map((c, j) => j === i ? { ...c, value: e.target.value } : c) }))} className="w-24 px-2 py-1.5 border rounded text-xs bg-background" />
                {i > 0 && <button onClick={() => setNewSeg(p => ({ ...p, conditions: p.conditions.filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            <button onClick={() => setNewSeg(p => ({ ...p, conditions: [...p.conditions, { field: "last_order_days", op: "gt", value: "30" }] }))} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="h-3 w-3" />Add Condition</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveMut.mutate()} disabled={!newSeg.name || saveMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Saving…" : "Save Segment"}</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map(seg => (
          <div key={seg.id} className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="font-semibold">{seg.name}</span>
                {seg.isSystem && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">System</span>}
              </div>
              {!seg.isSystem && <button onClick={() => deleteMut.mutate(seg.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
            {seg.description && <p className="text-xs text-muted-foreground mb-2">{seg.description}</p>}
            <div className="flex items-center gap-1.5 text-sm mb-3"><Users className="h-4 w-4 text-muted-foreground" /><span className="font-bold">{seg.customerCount}</span><span className="text-muted-foreground">customers</span></div>
            <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
              {seg.conditions.map((c, i) => <div key={i} className="font-mono bg-muted rounded px-1.5 py-0.5">{String(c.field).replace(/_/g," ")} {OPS[c.op]} {String(c.value)}</div>)}
            </div>
            <button onClick={() => setBroadcastTarget(seg)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-lg text-xs font-medium hover:bg-green-600"><Send className="h-3.5 w-3.5" />Broadcast to Segment</button>
          </div>
        ))}
      </div>
    </div>
  );
}
