import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Send, Plus, BarChart2, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import type { NPSSurvey, NPSResponse } from "@/lib/nps-surveys.functions";

export const Route = createFileRoute("/_app/nps-surveys")({
  component: NPSSurveysPage,
});

type Tab = "surveys" | "responses" | "create";

const MOCK_SURVEYS: NPSSurvey[] = [
  { id: "nps1", name: "Post-Order NPS — June", question: "SuperSender Pro ki service se aap kitne khush hain? (0-10 score bhejein)", triggerType: "post_order", status: "active", totalSent: 456, totalResponded: 234, promoters: 156, passives: 54, detractors: 24, npsScore: 57, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "nps2", name: "Renewal Satisfaction", question: "Renewal process kaisi rahi? (1-10 rating bhejein)", triggerType: "renewal", status: "active", totalSent: 123, totalResponded: 87, promoters: 68, passives: 12, detractors: 7, npsScore: 70, createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "nps3", name: "Product Quality Survey", question: "Purchased product se aap kitne satisfied hain? 0-10 mein batayein", triggerType: "manual", status: "completed", totalSent: 200, totalResponded: 112, promoters: 78, passives: 22, detractors: 12, npsScore: 59, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];
const MOCK_RESPONSES: NPSResponse[] = [
  { id: "r1", surveyId: "nps1", customerName: "Ahmed Khan", whatsapp: "03001234567", score: 10, category: "promoter", feedback: "Bohat acha service hai! Hamesha time pe deliver hoti hai.", respondedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "r2", surveyId: "nps1", customerName: "Sara Ali", whatsapp: "03111234567", score: 8, category: "promoter", feedback: "Good service, keep it up", respondedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "r3", surveyId: "nps1", customerName: "Bilal Raza", whatsapp: "03211234567", score: 6, category: "passive", feedback: "Theek hai, thoda improve ho sakta hai", respondedAt: new Date(Date.now() - 10800000).toISOString() },
  { id: "r4", surveyId: "nps1", customerName: "Fatima Noor", whatsapp: "03321234567", score: 3, category: "detractor", feedback: "Response time slow hai", respondedAt: new Date(Date.now() - 86400000).toISOString() },
];

const CAT_COLORS = { promoter: "bg-green-100 text-green-700", passive: "bg-yellow-100 text-yellow-700", detractor: "bg-red-100 text-red-700" };
const CAT_ICONS = { promoter: <ThumbsUp className="h-3.5 w-3.5" />, passive: <Minus className="h-3.5 w-3.5" />, detractor: <ThumbsDown className="h-3.5 w-3.5" /> };
const STATUS_COLORS = { active: "bg-green-100 text-green-700", completed: "bg-gray-100 text-gray-500", draft: "bg-blue-100 text-blue-700" };

function NPSGauge({ score }: { score: number }) {
  const color = score >= 50 ? "text-green-600" : score >= 0 ? "text-yellow-600" : "text-red-600";
  return <div className={`text-4xl font-black ${color}`}>{score}</div>;
}

export default function NPSSurveysPage() {
  const [tab, setTab] = useState<Tab>("surveys");
  const [selectedSurvey, setSelectedSurvey] = useState<string>("nps1");
  const [newSurvey, setNewSurvey] = useState({ name: "", question: "", triggerType: "manual" as const });
  const qc = useQueryClient();

  const { data: surveys = MOCK_SURVEYS } = useQuery({ queryKey: ["nps-surveys"], queryFn: async () => { const { getNPSSurveys } = await import("@/lib/nps-surveys.functions"); return getNPSSurveys(); }, placeholderData: MOCK_SURVEYS, staleTime: 60_000 });
  const { data: responses = MOCK_RESPONSES } = useQuery({ queryKey: ["nps-responses", selectedSurvey], queryFn: async () => { const { getNPSResponses } = await import("@/lib/nps-surveys.functions"); return getNPSResponses({ data: { surveyId: selectedSurvey } }); }, placeholderData: MOCK_RESPONSES, staleTime: 30_000 });

  const sendMut = useMutation({ mutationFn: async (id: string) => { const { sendNPSSurvey } = await import("@/lib/nps-surveys.functions"); return sendNPSSurvey({ data: { surveyId: id, targetAll: true } }); } });
  const saveMut = useMutation({ mutationFn: async () => { const { saveNPSSurvey } = await import("@/lib/nps-surveys.functions"); return saveNPSSurvey({ data: newSurvey }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["nps-surveys"] }); setTab("surveys"); } });

  const currentSurvey = surveys.find(s => s.id === selectedSurvey) ?? surveys[0];
  const totalNPSSent = (surveys as typeof MOCK_SURVEYS).reduce((s, n) => s + n.totalSent, 0);
  const avgNPS = Math.round((surveys as typeof MOCK_SURVEYS).reduce((s, n) => s + n.npsScore, 0) / surveys.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-yellow-500" /> NPS Surveys</h1>
          <p className="text-muted-foreground text-sm">Send Net Promoter Score surveys via WhatsApp and track satisfaction</p>
        </div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />New Survey</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{surveys.filter(s => s.status === "active").length}</div><div className="text-xs text-muted-foreground">Active Surveys</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{totalNPSSent.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Sent</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><NPSGauge score={avgNPS} /><div className="text-xs text-muted-foreground mt-1">Avg NPS Score</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{Math.round(((surveys as typeof MOCK_SURVEYS).reduce((s,n) => s + n.promoters, 0) / (surveys as typeof MOCK_SURVEYS).reduce((s,n) => s + n.totalResponded, 0)) * 100)}%</div><div className="text-xs text-green-600">Promoter Rate</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["surveys","responses","create"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "surveys" ? "Surveys" : t === "responses" ? "Responses" : "Create Survey"}</button>)}
      </div>

      {tab === "surveys" && (
        <div className="space-y-3">
          {(surveys as typeof MOCK_SURVEYS).map(s => (
            <div key={s.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div><div className="flex items-center gap-2 mb-1"><span className="font-semibold">{s.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{s.triggerType.replace("_"," ")}</span></div><div className="text-xs text-muted-foreground italic">"{s.question}"</div></div>
                <div className="text-right shrink-0">
                  <div className={`text-3xl font-black ${s.npsScore >= 50 ? "text-green-600" : s.npsScore >= 0 ? "text-yellow-600" : "text-red-600"}`}>{s.npsScore}</div>
                  <div className="text-xs text-muted-foreground">NPS Score</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs mb-3">
                <span className="text-muted-foreground">Sent: <strong className="text-foreground">{s.totalSent}</strong></span>
                <span className="text-muted-foreground">Responded: <strong className="text-foreground">{s.totalResponded} ({Math.round((s.totalResponded/s.totalSent)*100)}%)</strong></span>
                <span className="text-green-600">Promoters: <strong>{s.promoters}</strong></span>
                <span className="text-yellow-600">Passives: <strong>{s.passives}</strong></span>
                <span className="text-red-600">Detractors: <strong>{s.detractors}</strong></span>
              </div>
              <div className="h-2 rounded-full flex overflow-hidden mb-3">
                <div className="bg-green-400 h-2" style={{ width: `${(s.promoters/s.totalResponded)*100}%` }} />
                <div className="bg-yellow-300 h-2" style={{ width: `${(s.passives/s.totalResponded)*100}%` }} />
                <div className="bg-red-400 h-2" style={{ width: `${(s.detractors/s.totalResponded)*100}%` }} />
              </div>
              <div className="flex gap-2">
                {s.status === "active" && <button onClick={() => sendMut.mutate(s.id)} disabled={sendMut.isPending} className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-medium"><Send className="h-3.5 w-3.5" />Send Now</button>}
                <button onClick={() => { setSelectedSurvey(s.id); setTab("responses"); }} className="px-3 py-1.5 border rounded-lg text-xs hover:bg-accent">View Responses</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "responses" && (
        <div className="space-y-3">
          <div className="flex gap-2 mb-2">
            {(surveys as typeof MOCK_SURVEYS).map(s => <button key={s.id} onClick={() => setSelectedSurvey(s.id)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${selectedSurvey === s.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{s.name}</button>)}
          </div>
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30"><tr>{["Customer","Score","Category","Feedback","Date"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {(responses as typeof MOCK_RESPONSES).map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3"><div className="font-medium">{r.customerName}</div><div className="text-xs text-muted-foreground font-mono">{r.whatsapp}</div></td>
                    <td className="px-4 py-3"><div className={`text-xl font-bold ${r.score >= 9 ? "text-green-600" : r.score >= 7 ? "text-yellow-600" : "text-red-600"}`}>{r.score}</div></td>
                    <td className="px-4 py-3"><span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[r.category]}`}>{CAT_ICONS[r.category]}{r.category}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{r.feedback ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.respondedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-md space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Survey Name</label><input value={newSurvey.name} onChange={e => setNewSurvey(p => ({ ...p, name: e.target.value }))} placeholder="Post-Order NPS — July" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Question (sent via WhatsApp)</label><textarea value={newSurvey.question} onChange={e => setNewSurvey(p => ({ ...p, question: e.target.value }))} rows={3} placeholder="Hamari service se aap kitne khush hain? (0-10)" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Trigger</label><select value={newSurvey.triggerType} onChange={e => setNewSurvey(p => ({ ...p, triggerType: e.target.value as typeof p.triggerType }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background"><option value="manual">Manual Send</option><option value="post_order">After Every Order</option><option value="renewal">After Renewal</option><option value="scheduled">Scheduled</option></select></div>
            <button onClick={() => saveMut.mutate()} disabled={!newSurvey.name || !newSurvey.question || saveMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Creating…" : "Create Survey"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
