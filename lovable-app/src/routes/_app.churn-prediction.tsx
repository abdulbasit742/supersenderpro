import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Send, Brain, TrendingDown, Shield } from "lucide-react";
import type { ChurnRisk } from "@/lib/churn-prediction.functions";

export const Route = createFileRoute("/_app/churn-prediction")({
  component: ChurnPredictionPage,
});

const RISK_COLORS = { critical: "bg-red-100 text-red-700 border-red-300", high: "bg-orange-100 text-orange-700 border-orange-200", medium: "bg-yellow-100 text-yellow-700", low: "bg-green-100 text-green-700" };
const RISK_BAR = { critical: "bg-red-500", high: "bg-orange-400", medium: "bg-yellow-400", low: "bg-green-400" };

function makeRisk(i: number): ChurnRisk {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik","Zara Baig","Omar Qureshi","Nadia Shah","Faisal Ahmed","Ayesha Butt","Tariq Mehmood","Sana Sheikh"];
  const products = ["ChatGPT Plus","Midjourney Pro","Netflix Premium","Canva Pro","Adobe CC","LinkedIn Premium"];
  const score = Math.round(30 + (i * 6.5));
  const level = score >= 80 ? "critical" : score >= 65 ? "high" : score >= 45 ? "medium" : "low";
  const signals: string[] = [];
  if (score > 70) signals.push("No purchase in 45+ days");
  if (score > 60) signals.push("Last 2 renewals delayed");
  if (score > 50) signals.push("Support ticket unresolved");
  if (score > 80) signals.push("Competitor pricing inquiry");
  return { customerId: `c${i+1}`, customerName: names[i % names.length], whatsapp: `030${i}1234567`, riskScore: score, riskLevel: level as ChurnRisk["riskLevel"], lastOrderDays: 15 + i * 5, totalOrders: 20 - i, avgOrderInterval: 28 + i * 2, daysOverdue: Math.max(0, i * 3 - 10), lastProduct: products[i % products.length], predictedChurnDate: new Date(Date.now() + (30 - i * 3) * 86400000).toISOString(), signals, rescueSent: i % 4 === 0 };
}
const MOCK_RISKS: ChurnRisk[] = Array.from({ length: 12 }, (_, i) => makeRisk(i)).sort((a, b) => b.riskScore - a.riskScore);

const RESCUE_MSG = "Assalam Alaikum {{name}} bhai! 😊\n\nAapko miss kar raha tha! Kaafi waqt se aapka koi order nahi aaya.\n\nKya koi masla tha? Main personally help karna chahta hoon!\n\nAur ek special offer bhi hai aapke liye — reply karo aur batao kya chahiye! 🎁";

export default function ChurnPredictionPage() {
  const [filterLevel, setFilterLevel] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rescueMsg, setRescueMsg] = useState(RESCUE_MSG);
  const [showRescue, setShowRescue] = useState(false);
  const [sentResult, setSentResult] = useState<string | null>(null);

  const { data: risks = MOCK_RISKS } = useQuery({ queryKey: ["churn-risks"], queryFn: async () => { const { getChurnRisks } = await import("@/lib/churn-prediction.functions"); return getChurnRisks(); }, placeholderData: MOCK_RISKS, staleTime: 60_000 });

  const sendMut = useMutation({ mutationFn: async () => { const { sendRescueCampaign } = await import("@/lib/churn-prediction.functions"); return sendRescueCampaign({ data: { customerIds: Array.from(selected), message: rescueMsg } }); }, onSuccess: (r) => { setSentResult(`Rescue messages sent to ${(r as { sent?: number }).sent ?? selected.size} customers!`); setShowRescue(false); setSelected(new Set()); } });

  const filtered = filterLevel === "all" ? risks : risks.filter(r => r.riskLevel === filterLevel);
  const critical = risks.filter(r => r.riskLevel === "critical").length;
  const high = risks.filter(r => r.riskLevel === "high").length;
  const estimatedLoss = 184500;

  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(r => r.customerId)));
  const clearAll = () => setSelected(new Set());

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-purple-500" /> Churn Prediction</h1>
        <p className="text-muted-foreground text-sm">AI-powered risk scoring — identify at-risk customers before they leave</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-700">{critical}</div><div className="text-xs text-red-600">Critical Risk</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-700">{high}</div><div className="text-xs text-orange-600">High Risk</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">PKR {(estimatedLoss/1000).toFixed(0)}K</div><div className="text-xs text-muted-foreground">Est. Revenue at Risk</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{risks.filter(r=>r.rescueSent).length}</div><div className="text-xs text-green-600">Rescue Sent</div></div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["all","critical","high","medium","low"].map(l => <button key={l} onClick={() => setFilterLevel(l)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${filterLevel === l ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{l}</button>)}
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && <button onClick={() => setShowRescue(true)} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium"><Send className="h-4 w-4" />Rescue ({selected.size})</button>}
          <button onClick={selected.size ? clearAll : selectAll} className="px-3 py-2 border rounded-lg text-xs hover:bg-accent">{selected.size ? "Clear" : "Select All"}</button>
        </div>
      </div>

      {sentResult && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2"><Shield className="h-4 w-4" />{sentResult}</div>}

      {showRescue && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 space-y-3 max-w-lg">
          <h3 className="font-semibold">Send Rescue Campaign</h3>
          <p className="text-xs text-muted-foreground">Sending to {selected.size} at-risk customers</p>
          <textarea value={rescueMsg} onChange={e => setRescueMsg(e.target.value)} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
          <div className="flex gap-2">
            <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending} className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50">{sendMut.isPending ? "Sending…" : "Send Rescue Messages"}</button>
            <button onClick={() => setShowRescue(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.customerId} onClick={() => toggleSelect(r.customerId)} className={`bg-card border rounded-xl p-4 cursor-pointer transition-colors ${selected.has(r.customerId) ? "border-primary bg-primary/5" : "hover:border-primary/40"} ${r.riskLevel === "critical" ? "border-red-200" : ""}`}>
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(r.customerId)} onChange={() => toggleSelect(r.customerId)} onClick={e => e.stopPropagation()} className="mt-1 rounded" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2"><span className="font-semibold">{r.customerName}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${RISK_COLORS[r.riskLevel]}`}>{r.riskLevel}</span>{r.rescueSent && <span className="text-xs text-green-600 flex items-center gap-1"><Shield className="h-3 w-3" />Rescued</span>}</div>
                  <div className="flex items-center gap-2 shrink-0"><span className="font-mono font-bold text-sm">{r.riskScore}%</span><div className="w-16 h-2 bg-muted rounded-full"><div className={`h-2 rounded-full ${RISK_BAR[r.riskLevel]}`} style={{ width: `${r.riskScore}%` }} /></div></div>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                  <span>Last order: {r.lastOrderDays}d ago</span>
                  <span>Total orders: {r.totalOrders}</span>
                  <span>Last product: {r.lastProduct}</span>
                  <span className="text-red-500">Churn by: {new Date(r.predictedChurnDate).toLocaleDateString()}</span>
                </div>
                {r.signals.length > 0 && <div className="flex gap-1 flex-wrap">{r.signals.map(s => <span key={s} className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded">{s}</span>)}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
