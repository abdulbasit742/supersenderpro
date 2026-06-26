import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RotateCcw, Plus, Check, X, Clock, AlertTriangle } from "lucide-react";
import type { RefundRequest, RefundStatus } from "@/lib/refund-manager.functions";

export const Route = createFileRoute("/_app/refund-manager")({
  component: RefundManagerPage,
});

const MOCK_REFUNDS: RefundRequest[] = [
  { id: "rf1", refundNo: "RFD-001", customerName: "Ahmed Khan", whatsapp: "03001234567", orderId: "ORD-4521", product: "ChatGPT Plus", originalAmount: 3500, refundAmount: 3500, reason: "not_working", description: "Account access issue since 2 days", status: "pending", createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "rf2", refundNo: "RFD-002", customerName: "Sara Ali", whatsapp: "03111234567", orderId: "ORD-4489", product: "Netflix Premium", originalAmount: 2500, refundAmount: 2500, reason: "duplicate_order", description: "Paid twice by mistake", status: "approved", agentNote: "Confirmed duplicate", paymentMethod: "JazzCash", createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "rf3", refundNo: "RFD-003", customerName: "Bilal Raza", whatsapp: "03211234567", orderId: "ORD-4401", product: "Canva Pro", originalAmount: 1800, refundAmount: 1800, reason: "changed_mind", description: "Don't need it", status: "rejected", agentNote: "Policy: no refund after 24h", resolvedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "rf4", refundNo: "RFD-004", customerName: "Fatima Noor", whatsapp: "03321234567", orderId: "ORD-4356", product: "Adobe CC", originalAmount: 4500, refundAmount: 4500, reason: "quality_issue", description: "Account suspended by Adobe", status: "under_review", createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "rf5", refundNo: "RFD-005", customerName: "Hassan Malik", whatsapp: "03421234567", orderId: "ORD-4299", product: "Midjourney Pro", originalAmount: 4200, refundAmount: 4200, reason: "wrong_product", description: "Ordered basic but charged pro", status: "processed", resolvedAt: new Date(Date.now() - 2 * 86400000).toISOString(), paymentMethod: "Bank Transfer", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

const STATUS_COLORS: Record<RefundStatus, string> = { pending: "bg-yellow-100 text-yellow-700", under_review: "bg-blue-100 text-blue-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700", processed: "bg-gray-100 text-gray-500" };
const REASON_LABELS: Record<string, string> = { wrong_product: "Wrong Product", not_working: "Not Working", duplicate_order: "Duplicate Order", changed_mind: "Changed Mind", quality_issue: "Quality Issue", other: "Other" };

export default function RefundManagerPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("JazzCash");
  const [notify, setNotify] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRefund, setNewRefund] = useState({ customerName: "", whatsapp: "", orderId: "", product: "", originalAmount: 0, reason: "not_working", description: "" });
  const qc = useQueryClient();

  const { data: refunds = MOCK_REFUNDS } = useQuery({ queryKey: ["refunds", filterStatus], queryFn: async () => { const { getRefunds } = await import("@/lib/refund-manager.functions"); return getRefunds({ data: { status: filterStatus } }); }, placeholderData: MOCK_REFUNDS, staleTime: 30_000 });

  const statusMut = useMutation({ mutationFn: async (status: RefundStatus) => { if (!selectedRefund) return; const { updateRefundStatus } = await import("@/lib/refund-manager.functions"); return updateRefundStatus({ data: { refundId: selectedRefund.id, status, agentNote: note, paymentMethod, notifyCustomer: notify } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["refunds"] }); setSelectedRefund(null); } });
  const createMut = useMutation({ mutationFn: async () => { const { createRefund } = await import("@/lib/refund-manager.functions"); return createRefund({ data: { ...newRefund, originalAmount: Number(newRefund.originalAmount) } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["refunds"] }); setShowCreate(false); } });

  const filtered = filterStatus === "all" ? refunds : refunds.filter(r => r.status === filterStatus);
  const pendingTotal = (refunds as typeof MOCK_REFUNDS).filter(r => r.status === "pending" || r.status === "under_review").reduce((s, r) => s + r.refundAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="h-6 w-6 text-primary" /> Refund Manager</h1>
          <p className="text-muted-foreground text-sm">Process refund requests with approval workflow and WA customer notifications</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />New Refund</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-yellow-700">{(refunds as typeof MOCK_REFUNDS).filter(r => r.status === "pending").length}</div><div className="text-xs text-yellow-600">Pending</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">{(refunds as typeof MOCK_REFUNDS).filter(r => r.status === "under_review").length}</div><div className="text-xs text-blue-600">Under Review</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-orange-700">PKR {(pendingTotal/1000).toFixed(1)}K</div><div className="text-xs text-orange-600">Pending Amount</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{(refunds as typeof MOCK_REFUNDS).filter(r => r.status === "processed").length}</div><div className="text-xs text-green-600">Processed</div></div>
      </div>

      {showCreate && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 max-w-lg space-y-3">
          <h3 className="font-semibold">Create Refund Request</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground block mb-1">Customer</label><input value={newRefund.customerName} onChange={e => setNewRefund(p => ({ ...p, customerName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={newRefund.whatsapp} onChange={e => setNewRefund(p => ({ ...p, whatsapp: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground block mb-1">Order ID</label><input value={newRefund.orderId} onChange={e => setNewRefund(p => ({ ...p, orderId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Amount (PKR)</label><input type="number" value={newRefund.originalAmount} onChange={e => setNewRefund(p => ({ ...p, originalAmount: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">Reason</label><select value={newRefund.reason} onChange={e => setNewRefund(p => ({ ...p, reason: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{Object.entries(REASON_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Description</label><textarea value={newRefund.description} onChange={e => setNewRefund(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <div className="flex gap-2"><button onClick={() => createMut.mutate()} disabled={!newRefund.customerName || createMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{createMut.isPending ? "Creating…" : "Create"}</button><button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button></div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["all","pending","under_review","approved","rejected","processed"].map(s => <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{s.replace("_"," ")}</button>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.map(r => (
            <button key={r.id} onClick={() => { setSelectedRefund(r); setNote(r.agentNote ?? ""); }} className={`w-full text-left bg-card border rounded-xl p-3 hover:border-primary/50 transition-colors ${selectedRefund?.id === r.id ? "border-primary" : ""}`}>
              <div className="flex items-center justify-between gap-2 mb-1"><span className="font-mono text-xs text-muted-foreground">{r.refundNo}</span><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status.replace("_"," ")}</span></div>
              <div className="font-medium text-sm">{r.customerName}</div>
              <div className="text-xs text-muted-foreground">{r.product} · PKR {r.refundAmount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{REASON_LABELS[r.reason]}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedRefund ? (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 mb-1"><span className="font-mono text-xs text-muted-foreground">{selectedRefund.refundNo}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedRefund.status]}`}>{selectedRefund.status.replace("_"," ")}</span></div><div className="font-semibold text-lg">{selectedRefund.customerName}</div><div className="text-sm text-muted-foreground">{selectedRefund.whatsapp} · Order: {selectedRefund.orderId}</div></div><div className="text-right"><div className="text-2xl font-bold text-red-600">PKR {selectedRefund.refundAmount.toLocaleString()}</div><div className="text-xs text-muted-foreground">{selectedRefund.product}</div></div></div>
              <div className="bg-muted/40 rounded-lg p-3"><div className="text-xs font-semibold text-muted-foreground mb-1">Reason: {REASON_LABELS[selectedRefund.reason]}</div><p className="text-sm">{selectedRefund.description}</p></div>
              <div className="space-y-2 border-t pt-3">
                <div><label className="text-xs text-muted-foreground block mb-1">Agent Note</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add decision note…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
                <div><label className="text-xs text-muted-foreground block mb-1">Payment Method</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-background"><option>JazzCash</option><option>EasyPaisa</option><option>Bank Transfer</option><option>Cash</option></select></div>
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />Notify customer via WhatsApp</label>
                {selectedRefund.status === "pending" || selectedRefund.status === "under_review" ? (
                  <div className="flex gap-2">
                    <button onClick={() => statusMut.mutate("approved")} disabled={statusMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium"><Check className="h-4 w-4" />Approve</button>
                    <button onClick={() => statusMut.mutate("under_review")} disabled={statusMut.isPending} className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg text-sm">Move to Review</button>
                    <button onClick={() => statusMut.mutate("rejected")} disabled={statusMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"><X className="h-4 w-4" />Reject</button>
                  </div>
                ) : selectedRefund.status === "approved" ? (
                  <button onClick={() => statusMut.mutate("processed")} disabled={statusMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Mark as Processed</button>
                ) : null}
              </div>
            </div>
          ) : <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground"><RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Select a refund request</p></div>}
        </div>
      </div>
    </div>
  );
}
