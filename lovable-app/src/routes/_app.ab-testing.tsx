import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlaskConical, Play, Pause, Trophy, Plus, Send } from "lucide-react";
import type { ABTest } from "@/lib/ab-testing.functions";

export const Route = createFileRoute("/_app/ab-testing")({
  component: ABTestingPage,
});

type Tab = "tests" | "create";

const MOCK_TESTS: ABTest[] = [
  { id: "ab1", name: "Summer Offer — Tone Test", status: "completed", segmentSize: 200, winner: "B", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), startedAt: new Date(Date.now() - 7 * 86400000).toISOString(), completedAt: new Date(Date.now() - 2 * 86400000).toISOString(), variantA: { label: "Formal", message: "Dear Customer, we have an exclusive offer on ChatGPT Plus.", sentCount: 100, replyCount: 8, orderCount: 3, replyRate: 8, conversionRate: 3 }, variantB: { label: "Casual Urdu", message: "Bhai! ChatGPT Plus ka zabardast offer aaya hai 🔥 Sirf PKR 4200!", sentCount: 100, replyCount: 31, orderCount: 14, replyRate: 31, conversionRate: 14 } },
  { id: "ab2", name: "Renewal Reminder — CTA Test", status: "running", segmentSize: 150, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), startedAt: new Date(Date.now() - 86400000).toISOString(), variantA: { label: "With Price", message: "Hi {{name}}! Renew Claude Pro for PKR 3500 — reply NOW!", sentCount: 75, replyCount: 12, orderCount: 5, replyRate: 16, conversionRate: 6.7 }, variantB: { label: "Curiosity", message: "Hi {{name}}! Special renewal deal — reply YES to know more!", sentCount: 75, replyCount: 19, orderCount: 7, replyRate: 25.3, conversionRate: 9.3 } },
  { id: "ab3", name: "New Product Launch", status: "draft", segmentSize: 300, createdAt: new Date().toISOString(), variantA: { label: "No Emojis", message: "New product: Midjourney Pro. PKR 4500/month.", sentCount: 0, replyCount: 0, orderCount: 0, replyRate: 0, conversionRate: 0 }, variantB: { label: "Heavy Emojis", message: "🔥🎨 Midjourney Pro NOW! ✅ PKR 4500 🚀 Reply YES!", sentCount: 0, replyCount: 0, orderCount: 0, replyRate: 0, conversionRate: 0 } },
];

const STATUS_COLORS = { draft: "bg-gray-100 text-gray-600", running: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", paused: "bg-yellow-100 text-yellow-700" };

function VariantCard({ variant, label, isWinner }: { variant: ABTest["variantA"]; label: "A" | "B"; isWinner?: boolean }) {
  return (
    <div className={`border rounded-xl p-3 flex-1 ${isWinner ? "border-green-400 bg-green-50/50" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${label === "A" ? "bg-blue-500" : "bg-purple-500"}`}>{label}</span>
        <span className="font-medium text-sm">{variant.label}</span>
        {isWinner && <span className="flex items-center gap-1 text-xs text-green-700 font-medium ml-auto"><Trophy className="h-3 w-3" />Winner</span>}
      </div>
      <p className="text-xs text-muted-foreground bg-muted rounded p-2 mb-2 italic">"{variant.message.slice(0, 80)}{variant.message.length > 80 ? "…" : ""}"</p>
      <div className="grid grid-cols-3 gap-1 text-center text-xs">
        <div><div className="font-bold">{variant.sentCount}</div><div className="text-muted-foreground">Sent</div></div>
        <div><div className={`font-bold ${variant.replyRate > 20 ? "text-green-600" : ""}`}>{variant.replyRate}%</div><div className="text-muted-foreground">Reply Rate</div></div>
        <div><div className={`font-bold ${variant.conversionRate > 10 ? "text-green-600" : ""}`}>{variant.conversionRate}%</div><div className="text-muted-foreground">Conversion</div></div>
      </div>
    </div>
  );
}

export default function ABTestingPage() {
  const [tab, setTab] = useState<Tab>("tests");
  const [form, setForm] = useState({ name: "", segmentSize: 200, variantALabel: "Version A", variantAMessage: "", variantBLabel: "Version B", variantBMessage: "" });
  const qc = useQueryClient();

  const { data: tests = MOCK_TESTS } = useQuery({ queryKey: ["ab-tests"], queryFn: async () => { const { getABTests } = await import("@/lib/ab-testing.functions"); return getABTests(); }, placeholderData: MOCK_TESTS, staleTime: 60_000 });

  const launchMut = useMutation({ mutationFn: async (id: string) => { const { launchABTest } = await import("@/lib/ab-testing.functions"); return launchABTest({ data: { id } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["ab-tests"] }) });
  const pauseMut = useMutation({ mutationFn: async (id: string) => { const { pauseABTest } = await import("@/lib/ab-testing.functions"); return pauseABTest({ data: { id } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["ab-tests"] }) });
  const winnerMut = useMutation({ mutationFn: async ({ id, winner }: { id: string; winner: "A" | "B" }) => { const { pickWinner } = await import("@/lib/ab-testing.functions"); return pickWinner({ data: { id, winner } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["ab-tests"] }) });
  const saveMut = useMutation({ mutationFn: async () => { const { saveABTest } = await import("@/lib/ab-testing.functions"); return saveABTest({ data: form }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["ab-tests"] }); setTab("tests"); } });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="h-6 w-6 text-primary" /> A/B Broadcast Testing</h1>
          <p className="text-muted-foreground text-sm">Test two message versions, let data pick the winner</p>
        </div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> New Test</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 text-center"><div className="text-2xl font-bold">{tests.filter(t => t.status === "running").length}</div><div className="text-sm text-muted-foreground">Running Tests</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-700">{tests.filter(t => t.status === "completed").length}</div><div className="text-sm text-green-600">Completed</div></div>
        <div className="bg-card border rounded-xl p-4 text-center"><div className="text-2xl font-bold">{tests.filter(t => t.winner === "B").length}/{tests.filter(t => t.winner).length}</div><div className="text-sm text-muted-foreground">B wins</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["tests","create"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "tests" ? "All Tests" : "Create Test"}</button>)}
      </div>

      {tab === "tests" && (
        <div className="space-y-4">
          {tests.map(test => (
            <div key={test.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2"><span className="font-semibold">{test.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[test.status]}`}>{test.status}</span></div>
                <div className="flex gap-2 shrink-0">
                  {test.status === "draft" && <button onClick={() => launchMut.mutate(test.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"><Play className="h-3 w-3" />Launch</button>}
                  {test.status === "running" && <button onClick={() => pauseMut.mutate(test.id)} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600"><Pause className="h-3 w-3" />Pause</button>}
                  {test.status === "running" && (
                    <>
                      <button onClick={() => winnerMut.mutate({ id: test.id, winner: "A" })} className="px-3 py-1.5 border rounded text-xs hover:bg-accent">Pick A</button>
                      <button onClick={() => winnerMut.mutate({ id: test.id, winner: "B" })} className="px-3 py-1.5 border rounded text-xs hover:bg-accent">Pick B</button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-3">Segment: {test.segmentSize} · {test.startedAt ? `Started: ${new Date(test.startedAt).toLocaleDateString()}` : "Not started"}</div>
              <div className="flex gap-3">
                <VariantCard variant={test.variantA} label="A" isWinner={test.winner === "A"} />
                <VariantCard variant={test.variantB} label="B" isWinner={test.winner === "B"} />
              </div>
              {test.winner && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs text-green-700 flex items-center gap-2"><Trophy className="h-4 w-4" />Variant {test.winner} won! Broadcast sent to remaining audience with the winning message.</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Test Configuration</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Test Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. ChatGPT Offer Tone Test" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Audience Size (per variant)</label><input type="number" value={form.segmentSize} onChange={e => setForm(p => ({ ...p, segmentSize: Number(e.target.value) }))} className="w-32 px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          </div>
          {(["A","B"] as const).map(v => (
            <div key={v} className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2"><span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${v === "A" ? "bg-blue-500" : "bg-purple-500"}`}>{v}</span><h3 className="font-semibold">Variant {v}</h3></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Label</label><input value={v === "A" ? form.variantALabel : form.variantBLabel} onChange={e => setForm(p => ({ ...p, [`variant${v}Label`]: e.target.value }))} placeholder={`e.g. ${v === "A" ? "Formal" : "Casual"}`} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Message</label><textarea value={v === "A" ? form.variantAMessage : form.variantBMessage} onChange={e => setForm(p => ({ ...p, [`variant${v}Message`]: e.target.value }))} rows={3} placeholder={`Variant ${v} message…`} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            </div>
          ))}
          <button onClick={() => saveMut.mutate()} disabled={!form.name || !form.variantAMessage || !form.variantBMessage || saveMut.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><FlaskConical className="h-4 w-4" />{saveMut.isPending ? "Creating…" : "Create Test"}</button>
        </div>
      )}
    </div>
  );
}
