import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { GitBranch, Play, Pause, Plus, Trash2, Save, Users, CheckCircle } from "lucide-react";
import type { CustomerJourney, JourneyStep, JourneyTrigger, StepType, JourneyEnrollment } from "@/lib/lifecycle-journey.functions";

export const Route = createFileRoute("/_app/lifecycle-journey")({
  component: LifecycleJourneyPage,
});

type Tab = "journeys" | "enrollments" | "create";

const TRIGGER_LABELS: Record<JourneyTrigger, string> = {
  new_customer: "🆕 New Customer", order_placed: "📦 Order Placed", payment_received: "💰 Payment Received",
  order_expired: "⏰ Order Expired", churn_risk: "⚠️ Churn Risk", birthday: "🎂 Birthday", manual: "✋ Manual",
};
const STEP_LABELS: Record<StepType, string> = {
  wait: "⏳ Wait", send_message: "💬 Send Message", send_template: "📋 Send Template",
  add_tag: "🏷️ Add Tag", update_status: "📊 Update Status", webhook: "🔗 Webhook", ai_message: "🤖 AI Message",
};
const STATUS_COLORS = { active: "bg-green-100 text-green-700", completed: "bg-blue-100 text-blue-700", paused: "bg-yellow-100 text-yellow-700", failed: "bg-red-100 text-red-700" };

const MOCK_JOURNEYS: CustomerJourney[] = [
  {
    id: "j1", name: "New Customer Onboarding", trigger: "new_customer", isActive: true, enrolledCount: 34, completedCount: 28, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    steps: [
      { id: "s1", type: "send_message", label: "Welcome Message", config: { message: "Welcome to SuperSender Pro, {{name}}! 🎉 We're excited to have you on board. Reply anytime if you need help!" } },
      { id: "s2", type: "wait", label: "Wait 3 days", config: {}, delayDays: 3 },
      { id: "s3", type: "send_message", label: "Check-in", config: { message: "Hi {{name}}! How's everything going? 😊 Let us know if you need any help with your subscription." } },
      { id: "s4", type: "wait", label: "Wait 7 days", config: {}, delayDays: 7 },
      { id: "s5", type: "send_message", label: "Upsell", config: { message: "Hi {{name}}! Did you know we also offer Claude Pro & LinkedIn Premium? Great deals available 🔥" } },
    ],
  },
  {
    id: "j2", name: "Renewal Reminder Chain", trigger: "order_expired", isActive: true, enrolledCount: 89, completedCount: 72, createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    steps: [
      { id: "s1", type: "send_message", label: "7-day warning", config: { message: "Hi {{name}}! Your {{product}} expires in 7 days. Renew now to avoid interruption! 🔔" }, delayDays: 0 },
      { id: "s2", type: "wait", label: "Wait 4 days", config: {}, delayDays: 4 },
      { id: "s3", type: "send_message", label: "3-day warning", config: { message: "⚠️ {{name}}, only 3 days left! Reply NOW to renew your subscription." } },
      { id: "s4", type: "wait", label: "Wait 3 days", config: {}, delayDays: 3 },
      { id: "s5", type: "ai_message", label: "AI Win-back", config: { prompt: "Write a final win-back message for a customer whose subscription just expired" } },
    ],
  },
  {
    id: "j3", name: "Churn Prevention", trigger: "churn_risk", isActive: false, enrolledCount: 12, completedCount: 5, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    steps: [
      { id: "s1", type: "send_message", label: "Check-in", config: { message: "Hi {{name}}! We haven't heard from you in a while. Miss you! 💙 Is everything OK?" } },
      { id: "s2", type: "wait", label: "Wait 2 days", config: {}, delayDays: 2 },
      { id: "s3", type: "send_message", label: "Special offer", config: { message: "{{name}} special offer just for you! 🎁 10% off on next renewal. Reply YES to claim!" } },
    ],
  },
];

const MOCK_ENROLLMENTS: JourneyEnrollment[] = [
  { id: "e1", journeyId: "j1", journeyName: "New Customer Onboarding", customerId: "c1", customerName: "Ahmed Khan", currentStep: 2, status: "active", nextActionAt: new Date(Date.now() + 86400000).toISOString(), startedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "e2", journeyId: "j2", journeyName: "Renewal Reminder Chain", customerId: "c2", customerName: "Sara Ali", currentStep: 4, status: "completed", startedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: "e3", journeyId: "j1", journeyName: "New Customer Onboarding", customerId: "c3", customerName: "Bilal Raza", currentStep: 0, status: "active", nextActionAt: new Date(Date.now() + 3600000).toISOString(), startedAt: new Date(Date.now() - 86400000).toISOString() },
];

function JourneyCard({ journey, onToggle, onDelete }: { journey: CustomerJourney; onToggle: (j: CustomerJourney) => void; onDelete: (id: string) => void }) {
  const progress = journey.enrolledCount > 0 ? Math.round((journey.completedCount / journey.enrolledCount) * 100) : 0;
  return (
    <div className={`bg-card border rounded-xl p-4 ${!journey.isActive ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{journey.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${journey.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{journey.isActive ? "Active" : "Paused"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs bg-secondary px-2 py-0.5 rounded">{TRIGGER_LABELS[journey.trigger]}</span>
            <span>{journey.steps.length} steps</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onToggle(journey)} className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${journey.isActive ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
            {journey.isActive ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
          </button>
          <button onClick={() => onDelete(journey.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm mb-3">
        <span><span className="font-bold">{journey.enrolledCount}</span> <span className="text-muted-foreground">enrolled</span></span>
        <span><span className="font-bold text-green-600">{journey.completedCount}</span> <span className="text-muted-foreground">completed</span></span>
        <span className="text-muted-foreground">{progress}% success</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full"><div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${progress}%` }} /></div>
      <div className="mt-3 flex gap-1 flex-wrap">
        {journey.steps.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
            <span className="text-muted-foreground">{i + 1}.</span>{STEP_LABELS[s.type]}
            {(s.delayDays ?? 0) > 0 && <span className="text-muted-foreground ml-0.5">+{s.delayDays}d</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LifecycleJourneyPage() {
  const [tab, setTab] = useState<Tab>("journeys");
  const [newJourney, setNewJourney] = useState({ name: "", trigger: "new_customer" as JourneyTrigger, steps: [] as JourneyStep[] });
  const qc = useQueryClient();

  const { data: journeys = MOCK_JOURNEYS } = useQuery({
    queryKey: ["journeys"], queryFn: async () => { const { getJourneys } = await import("@/lib/lifecycle-journey.functions"); return getJourneys(); }, placeholderData: MOCK_JOURNEYS, staleTime: 60_000,
  });
  const { data: enrollments = MOCK_ENROLLMENTS } = useQuery({
    queryKey: ["enrollments"], queryFn: async () => { const { getEnrollments } = await import("@/lib/lifecycle-journey.functions"); return getEnrollments(); }, placeholderData: MOCK_ENROLLMENTS, staleTime: 30_000,
  });

  const toggleMut = useMutation({
    mutationFn: async (j: CustomerJourney) => { const { toggleJourney } = await import("@/lib/lifecycle-journey.functions"); return toggleJourney({ data: { id: j.id, isActive: !j.isActive } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journeys"] }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { deleteJourney } = await import("@/lib/lifecycle-journey.functions"); return deleteJourney({ data: { id } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journeys"] }),
  });
  const saveMut = useMutation({
    mutationFn: async () => { const { saveJourney } = await import("@/lib/lifecycle-journey.functions"); return saveJourney({ data: { name: newJourney.name, trigger: newJourney.trigger, steps: newJourney.steps, isActive: true } }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journeys"] }); setTab("journeys"); setNewJourney({ name: "", trigger: "new_customer", steps: [] }); },
  });

  const addStep = (type: StepType) => {
    const step: JourneyStep = { id: `s_${Date.now()}`, type, label: STEP_LABELS[type], config: type === "send_message" ? { message: "" } : type === "wait" ? {} : {}, delayDays: type === "wait" ? 1 : 0 };
    setNewJourney(p => ({ ...p, steps: [...p.steps, step] }));
  };

  const activeCount = journeys.filter(j => j.isActive).length;
  const totalEnrolled = journeys.reduce((s, j) => s + j.enrolledCount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6 text-primary" /> Customer Lifecycle Journeys</h1>
          <p className="text-muted-foreground text-sm">Automated multi-step customer journeys — set once, run forever</p>
        </div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> New Journey</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-700">{activeCount}</div><div className="text-sm text-green-600">Active Journeys</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-blue-700">{totalEnrolled}</div><div className="text-sm text-blue-600">Total Enrolled</div></div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-purple-700">{enrollments.filter(e => e.status === "active").length}</div><div className="text-sm text-purple-600">Currently Active</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["journeys","enrollments","create"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "journeys" ? "All Journeys" : t === "enrollments" ? "Enrollments" : "Create New"}
          </button>
        ))}
      </div>

      {tab === "journeys" && <div className="space-y-4">{journeys.map(j => <JourneyCard key={j.id} journey={j} onToggle={j => toggleMut.mutate(j)} onDelete={id => deleteMut.mutate(id)} />)}</div>}

      {tab === "enrollments" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Customer","Journey","Step","Status","Next Action","Started"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {enrollments.map(e => (
                <tr key={e.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{e.customerName ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{e.journeyName}</td>
                  <td className="px-4 py-3 text-center">{e.currentStep + 1}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.nextActionAt ? new Date(e.nextActionAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.startedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Journey Details</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Name</label><input value={newJourney.name} onChange={e => setNewJourney(p => ({ ...p, name: e.target.value }))} placeholder="e.g. New Customer Onboarding" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Trigger</label>
              <select value={newJourney.trigger} onChange={e => setNewJourney(p => ({ ...p, trigger: e.target.value as JourneyTrigger }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Steps</h3></div>
            {newJourney.steps.map((step, i) => (
              <div key={step.id} className="flex items-start gap-3 bg-muted rounded-xl p-3">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-medium">{STEP_LABELS[step.type]}</div>
                  {step.type === "send_message" && <textarea value={String(step.config.message ?? "")} onChange={e => setNewJourney(p => ({ ...p, steps: p.steps.map((s, j) => j === i ? { ...s, config: { ...s.config, message: e.target.value } } : s) }))} rows={2} placeholder="Message text… use {{name}} for customer name" className="w-full px-2 py-1.5 border rounded text-xs bg-background resize-none" />}
                  {step.type === "wait" && <div className="flex items-center gap-2"><input type="number" value={step.delayDays ?? 1} onChange={e => setNewJourney(p => ({ ...p, steps: p.steps.map((s, j) => j === i ? { ...s, delayDays: Number(e.target.value) } : s) }))} className="w-20 px-2 py-1 border rounded text-xs bg-background" /><span className="text-xs text-muted-foreground">days</span></div>}
                </div>
                <button onClick={() => setNewJourney(p => ({ ...p, steps: p.steps.filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Add step:</p>
              <div className="flex flex-wrap gap-2">
                {(["wait","send_message","ai_message","send_template","add_tag","webhook"] as StepType[]).map(t => (
                  <button key={t} onClick={() => addStep(t)} className="px-2.5 py-1.5 border rounded-lg text-xs hover:bg-accent flex items-center gap-1"><Plus className="h-3 w-3" />{STEP_LABELS[t]}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => saveMut.mutate()} disabled={!newJourney.name || newJourney.steps.length === 0 || saveMut.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />{saveMut.isPending ? "Saving…" : "Save Journey"}</button>
        </div>
      )}
    </div>
  );
}
