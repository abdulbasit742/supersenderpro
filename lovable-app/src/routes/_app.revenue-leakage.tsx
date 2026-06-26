import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Send, CheckCircle, TrendingDown, DollarSign } from "lucide-react";
import type { LeakageItem, LeakageType } from "@/lib/revenue-leakage.functions";

export const Route = createFileRoute("/_app/revenue-leakage")({
  component: RevenueLeakagePage,
});

const MOCK_ITEMS: LeakageItem[] = [
  { id: "lk1", type: "unpaid_order", customerName: "Ahmed Khan", whatsapp: "03001234567", amount: 3500, product: "ChatGPT Plus", daysSince: 12, description: "Order placed 12 days ago, payment not confirmed", priority: "critical", actionTaken: false },
  { id: "lk2", type: "expired_sub", customerName: "Sara Ali", whatsapp: "03111234567", amount: 2500, product: "Netflix Premium", daysSince: 8, description: "Subscription expired, no renewal order received", priority: "high", actionTaken: false },
  { id: "lk3", type: "missed_renewal", customerName: "Bilal Raza", whatsapp: "03211234567", amount: 4200, product: "Midjourney Pro", daysSince: 5, description: "Renewal due 5 days ago, customer not responded", priority: "high", actionTaken: true },
  { id: "lk4", type: "pending_payment", customerName: "Fatima Noor", whatsapp: "03321234567", amount: 1800, product: "Canva Pro", daysSince: 3, description: "Payment screenshot received but not verified", priority: "medium", actionTaken: false },
  { id: "lk5", type: "unpaid_order", customerName: "Hassan Malik", whatsapp: "03421234567", amount: 4500, product: "Adobe CC", daysSince: 18, description: "COD order never paid, delivered 18 days ago", priority: "critical", actionTaken: false },
  { id: "lk6", type: "duplicate_charge", customerName: "Zara Baig", whatsapp: "03521234567", amount: 3500, product: "ChatGPT Plus", daysSince: 2, description: "Customer charged twice — pending refund", priority: "critical", actionTaken: false },
  { id: "lk7", type: "refund_overdue", customerName: "Omar Qureshi", whatsapp: "03621234567", amount: 2500, product: "Netflix Premium", daysSince: 7, description: "Approved refund not processed in 7 days", priority: "high", actionTaken: false },
  { id: "lk8", type: "expired_sub", customerName: "Nadia Shah", whatsapp: "03721234567", amount: 1200, product: "Spotify Family", daysSince: 14, description: "Subscription expired, no contact made yet", priority: "medium", actionTaken: false },
];

const TYPE_LABELS: Record<LeakageType, string> = { unpaid_order: "Unpaid Order", expired_sub: "Expired Sub", duplicate_charge: "Duplicate Charge", missed_renewal: "Missed Renewal", pending_payment: "Pending Payment", refund_overdue: "Refund Overdue" };
const TYPE_COLORS: Record<LeakageType, string> = { unpaid_order: "bg-red-100 text-red-700", expired_sub: "bg-orange-100 text-orange-700", duplicate_charge: "bg-purple-100 text-purple-700", missed_renewal: "bg-yellow-100 text-yellow-700", pending_payment: "bg-blue-100 text-blue-700", refund_overdue: "bg-pink-100 text-pink-700" };
const PRIORITY_COLORS = { critical: "border-l-red-500", high: "border-l-orange-400", medium: "border-l-yellow-400" };

export default function RevenueLeakagePage() {
  const [filter, setFilter] = useState("all");
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: items = MOCK_ITEMS } = useQuery({ queryKey: ["leakage-items"], queryFn: async () => { const { getLeakageItems } = await import("@/lib/revenue-leakage.functions"); return getLeakageItems(); }, placeholderData: MOCK_ITEMS, staleTime: 30_000 });

  const actionMut = useMutation({ mutationFn: async (id: string) => { const { markActionTaken } = await import("@/lib/revenue-leakage.functions"); await markActionTaken(); return id; }, onSuccess: (id) => setResolved(p => new Set([...p, id])) });
  const sendMut = useMutation({ mutationFn: async (id: string) => { const { sendRecoveryMessage } = await import("@/lib/revenue-leakage.functions"); await sendRecoveryMessage(); return id; }, onSuccess: (id) => setResolved(p => new Set([...p, id])) });

  const filtered = (items as typeof MOCK_ITEMS).filter(i => !i.actionTaken && !resolved.has(i.id)).filter(i => filter === "all" || i.type === filter || i.priority === filter);
  const totalLoss = filtered.reduce((s, i) => s + i.amount, 0);
  const critical = filtered.filter(i => i.priority === "critical").length;
  const recovered = MOCK_ITEMS.filter(i => i.actionTaken || resolved.has(i.id)).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="h-6 w-6 text-red-500" /> Revenue Leakage Detector</h1>
        <p className="text-muted-foreground text-sm">Find and fix gaps — unpaid orders, expired subs, pending payments</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-red-700">PKR {(totalLoss/1000).toFixed(1)}K</div><div className="text-xs text-red-600">Total Leakage</div></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-700">{critical}</div><div className="text-xs text-red-600">Critical Issues</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-700">{filtered.length}</div><div className="text-xs text-orange-600">Open Issues</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">PKR {(recovered/1000).toFixed(0)}K</div><div className="text-xs text-green-600">Resolved</div></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all","critical","high","medium","unpaid_order","expired_sub","missed_renewal","pending_payment"].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{f.replace(/_/g," ")}</button>)}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-green-700 font-medium">No leakage detected!</p></div> :
        filtered.map(item => (
          <div key={item.id} className={`bg-card border-l-4 border rounded-xl p-4 ${PRIORITY_COLORS[item.priority]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {item.priority === "critical" && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{item.customerName}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type]}`}>{TYPE_LABELS[item.type]}</span></div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                  <div className="flex gap-3 mt-1 text-xs"><span className="text-muted-foreground">{item.whatsapp}</span><span className="text-muted-foreground">{item.product}</span><span className="text-muted-foreground">{item.daysSince}d ago</span></div>
                </div>
              </div>
              <div className="flex items-start gap-2 shrink-0">
                <div className="text-right"><div className="font-bold text-red-600">PKR {item.amount.toLocaleString()}</div><div className="text-xs text-muted-foreground capitalize">{item.priority} priority</div></div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => sendMut.mutate(item.id)} disabled={sendMut.isPending} className="flex items-center gap-1 px-2.5 py-1 bg-[#25D366] text-white rounded text-xs"><Send className="h-3 w-3" />WA</button>
                  <button onClick={() => actionMut.mutate(item.id)} disabled={actionMut.isPending} className="flex items-center gap-1 px-2.5 py-1 border rounded text-xs hover:bg-accent"><CheckCircle className="h-3 w-3" />Done</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
