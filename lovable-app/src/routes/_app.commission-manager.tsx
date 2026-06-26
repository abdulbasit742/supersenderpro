import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeDollarSign, CheckCircle, Wallet } from "lucide-react";
import type { CommissionRecord, AgentCommissionSummary } from "@/lib/commission-manager.functions";

export const Route = createFileRoute("/_app/commission-manager")({
  component: CommissionManagerPage,
});

type Tab = "overview" | "records" | "pay";

function makeComm(i: number): CommissionRecord {
  const agents = ["Imran Bhai","Ayesha","Usman Malik","Sana Support","Hassan Sales"];
  const products = ["ChatGPT Plus","Netflix Premium","Canva Pro","Midjourney Pro","Adobe CC"];
  const amounts = [3500,2500,1800,4200,5500];
  const rate = [10,8,10,8,10][i%5];
  const sale = amounts[i%5];
  const statuses: CommissionRecord["status"][] = ["pending","approved","paid","paid","pending","approved","paid","paid","pending","approved"];
  const d = new Date(); d.setDate(d.getDate() - i*2);
  return { id: `cm${i+1}`, agentId: `ag${(i%5)+1}`, agentName: agents[i%5], orderId: `ORD-${4500-i}`, product: products[i%5], saleAmount: sale, commissionRate: rate, commissionAmount: Math.round(sale*rate/100), status: statuses[i%statuses.length], earnedAt: d.toISOString(), paidAt: statuses[i%statuses.length]==="paid" ? new Date(d.getTime()+86400000).toISOString() : undefined };
}
const MOCK_RECORDS: CommissionRecord[] = Array.from({ length: 20 }, (_,i) => makeComm(i));
const MOCK_SUMMARIES: AgentCommissionSummary[] = [
  { agentId: "ag1", agentName: "Imran Bhai", commissionRate: 10, pendingAmount: 4200, approvedAmount: 8400, paidThisMonth: 32000, totalEarned: 89000 },
  { agentId: "ag2", agentName: "Ayesha", commissionRate: 8, pendingAmount: 1600, approvedAmount: 3200, paidThisMonth: 18000, totalEarned: 42000 },
  { agentId: "ag3", agentName: "Usman Malik", commissionRate: 10, pendingAmount: 2800, approvedAmount: 5600, paidThisMonth: 24000, totalEarned: 61000 },
];

const STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-700", approved: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-700" };

export default function CommissionManagerPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payAgent, setPayAgent] = useState<AgentCommissionSummary | null>(null);
  const [payMethod, setPayMethod] = useState("JazzCash");
  const qc = useQueryClient();

  const { data: records = MOCK_RECORDS } = useQuery({ queryKey: ["commissions", statusFilter], queryFn: async () => { const { getCommissions } = await import("@/lib/commission-manager.functions"); return getCommissions({ data: { status: statusFilter === "all" ? undefined : statusFilter } }); }, placeholderData: MOCK_RECORDS, staleTime: 30_000 });
  const { data: summaries = MOCK_SUMMARIES } = useQuery({ queryKey: ["commission-summaries"], queryFn: async () => { const { getCommissionSummaries } = await import("@/lib/commission-manager.functions"); return getCommissionSummaries(); }, placeholderData: MOCK_SUMMARIES, staleTime: 60_000 });

  const approveMut = useMutation({ mutationFn: async () => { const { approveCommission } = await import("@/lib/commission-manager.functions"); return approveCommission({ data: { commissionIds: Array.from(selected) } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); setSelected(new Set()); } });
  const payMut = useMutation({ mutationFn: async () => { if (!payAgent) return; const { payCommission } = await import("@/lib/commission-manager.functions"); return payCommission({ data: { agentId: payAgent.agentId, amount: payAgent.approvedAmount, method: payMethod } }); }, onSuccess: () => { setPayAgent(null); qc.invalidateQueries({ queryKey: ["commissions"] }); } });

  const filtered = (records as typeof MOCK_RECORDS).filter(r => statusFilter === "all" || r.status === statusFilter);
  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const totalPending = (summaries as typeof MOCK_SUMMARIES).reduce((s, a) => s + a.pendingAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><BadgeDollarSign className="h-6 w-6 text-primary" /> Commission Manager</h1><p className="text-muted-foreground text-sm">Track, approve and pay team commissions — per-sale earnings with full history</p></div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center"><div className="text-lg font-bold text-yellow-700">PKR {(totalPending/1000).toFixed(1)}K</div><div className="text-xs text-yellow-600">Pending Approval</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-lg font-bold text-blue-700">PKR {((summaries as typeof MOCK_SUMMARIES).reduce((s,a) => s+a.approvedAmount,0)/1000).toFixed(1)}K</div><div className="text-xs text-blue-600">Approved, Unpaid</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-lg font-bold text-green-700">PKR {((summaries as typeof MOCK_SUMMARIES).reduce((s,a) => s+a.paidThisMonth,0)/1000).toFixed(0)}K</div><div className="text-xs text-green-600">Paid This Month</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["overview","records","pay"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "pay" ? "Pay Agents" : t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          {(summaries as typeof MOCK_SUMMARIES).map(agent => (
            <div key={agent.agentId} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3"><div><div className="font-bold">{agent.agentName}</div><div className="text-xs text-muted-foreground">{agent.commissionRate}% commission rate</div></div><div className="text-right"><div className="text-lg font-bold text-green-700">PKR {(agent.totalEarned/1000).toFixed(0)}K</div><div className="text-xs text-muted-foreground">Total Earned</div></div></div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-yellow-50 rounded p-1.5"><div className="font-semibold text-yellow-700">PKR {agent.pendingAmount.toLocaleString()}</div><div className="text-muted-foreground">Pending</div></div>
                <div className="bg-blue-50 rounded p-1.5"><div className="font-semibold text-blue-700">PKR {agent.approvedAmount.toLocaleString()}</div><div className="text-muted-foreground">Approved</div></div>
                <div className="bg-green-50 rounded p-1.5"><div className="font-semibold text-green-700">PKR {(agent.paidThisMonth/1000).toFixed(0)}K</div><div className="text-muted-foreground">Paid/Month</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "records" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">{["all","pending","approved","paid"].map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{s}</button>)}</div>
            {selected.size > 0 && <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending} className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-xs"><CheckCircle className="h-3.5 w-3.5" />Approve {selected.size} Selected</button>}
          </div>
          {filtered.map(r => (
            <div key={r.id} className="bg-card border rounded-xl p-3 flex items-center gap-3">
              {r.status === "pending" && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="rounded shrink-0" />}
              <div className="flex-1"><div className="flex items-center gap-2 mb-0.5"><span className="font-medium text-sm">{r.agentName}</span><span className="text-xs text-muted-foreground">· {r.orderId} · {r.product}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></div><div className="text-xs text-muted-foreground">{new Date(r.earnedAt).toLocaleDateString()} · Sale: PKR {r.saleAmount.toLocaleString()} × {r.commissionRate}%</div></div>
              <div className="text-right shrink-0"><div className="font-bold">PKR {r.commissionAmount.toLocaleString()}</div>{r.paidAt && <div className="text-xs text-green-600">Paid {new Date(r.paidAt).toLocaleDateString()}</div>}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "pay" && (
        <div className="space-y-3">
          {(summaries as typeof MOCK_SUMMARIES).filter(a => a.approvedAmount > 0).map(agent => (
            <div key={agent.agentId} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3">
              <div><div className="font-semibold">{agent.agentName}</div><div className="text-sm text-blue-700 font-medium">PKR {agent.approvedAmount.toLocaleString()} approved & ready to pay</div></div>
              <button onClick={() => setPayAgent(agent)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium"><Wallet className="h-4 w-4" />Pay Now</button>
            </div>
          ))}
          {payAgent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-3">
                <h3 className="font-bold text-lg">Pay {payAgent.agentName}</h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">PKR {payAgent.approvedAmount.toLocaleString()}</div><div className="text-xs text-green-600">Commission Payout</div></div>
                <div><label className="text-xs text-muted-foreground block mb-1">Payment Method</label><select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-background"><option>JazzCash</option><option>EasyPaisa</option><option>Bank Transfer</option><option>Cash</option></select></div>
                <div className="flex gap-2"><button onClick={() => payMut.mutate()} disabled={payMut.isPending} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">{payMut.isPending ? "Processing…" : "Confirm Payment"}</button><button onClick={() => setPayAgent(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
