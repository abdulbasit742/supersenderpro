import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserCheck, Plus, Play, Pause, CheckCircle, Clock } from "lucide-react";
import type { OnboardingStep, CustomerOnboarding } from "@/lib/onboarding-flow.functions";

export const Route = createFileRoute("/_app/onboarding-flow")({
  component: OnboardingFlowPage,
});

type Tab = "customers" | "steps" | "add";

const MOCK_STEPS: OnboardingStep[] = [
  { id: "os1", order: 1, title: "Welcome Message", description: "Send warm welcome with order details", delayHours: 0, messageTemplate: "🎉 Welcome {{name}}! Aapka {{product}} order mila. Credentials 2 ghante mein aayenge!", isActive: true },
  { id: "os2", order: 2, title: "Credentials Delivery", description: "Send login credentials", delayHours: 2, messageTemplate: "✅ {{name}} — yahan hain aapke credentials:\nEmail: {{email}}\nPass: {{password}}", isActive: true },
  { id: "os3", order: 3, title: "Day 1 Check-in", description: "Check if product is working", delayHours: 24, messageTemplate: "{{name}}, {{product}} kaisa chal raha hai? 😊 Reply YES if all good!", isActive: true },
  { id: "os4", order: 4, title: "Day 3 Tips", description: "Share product tips", delayHours: 72, messageTemplate: "💡 {{name}}, {{product}} ki ek zabardast tip: {{tip}}", isActive: true },
  { id: "os5", order: 5, title: "Day 7 Feedback", description: "Request NPS rating", delayHours: 168, messageTemplate: "🙏 {{name}}, ek hafte hogaya! Hamari service rate karein 1-10 mein?", isActive: true },
];
const MOCK_ONBOARDINGS: CustomerOnboarding[] = [
  { id: "ob1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", startedAt: new Date(Date.now() - 3600000).toISOString(), currentStep: 1, totalSteps: 5, status: "active", nextMessageAt: new Date(Date.now() + 5400000).toISOString(), completedSteps: [1] },
  { id: "ob2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", startedAt: new Date(Date.now() - 86400000).toISOString(), currentStep: 3, totalSteps: 5, status: "active", nextMessageAt: new Date(Date.now() + 48 * 3600000).toISOString(), completedSteps: [1, 2, 3] },
  { id: "ob3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", startedAt: new Date(Date.now() - 7 * 86400000).toISOString(), currentStep: 5, totalSteps: 5, status: "completed", completedSteps: [1, 2, 3, 4, 5] },
  { id: "ob4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", startedAt: new Date(Date.now() - 2 * 86400000).toISOString(), currentStep: 2, totalSteps: 5, status: "paused", completedSteps: [1, 2] },
];

const STATUS_COLORS = { active: "bg-green-100 text-green-700", completed: "bg-blue-100 text-blue-700", paused: "bg-yellow-100 text-yellow-700", dropped: "bg-red-100 text-red-700" };

export default function OnboardingFlowPage() {
  const [tab, setTab] = useState<Tab>("customers");
  const [newCustomer, setNewCustomer] = useState({ customerName: "", whatsapp: "" });
  const [editStep, setEditStep] = useState<OnboardingStep | null>(null);
  const qc = useQueryClient();

  const { data: steps = MOCK_STEPS } = useQuery({ queryKey: ["onboarding-steps"], queryFn: async () => { const { getOnboardingSteps } = await import("@/lib/onboarding-flow.functions"); return getOnboardingSteps(); }, placeholderData: MOCK_STEPS, staleTime: 300_000 });
  const { data: onboardings = MOCK_ONBOARDINGS } = useQuery({ queryKey: ["customer-onboardings"], queryFn: async () => { const { getCustomerOnboardings } = await import("@/lib/onboarding-flow.functions"); return getCustomerOnboardings(); }, placeholderData: MOCK_ONBOARDINGS, staleTime: 30_000 });

  const startMut = useMutation({ mutationFn: async () => { const { startOnboarding } = await import("@/lib/onboarding-flow.functions"); return startOnboarding({ data: { ...newCustomer, customerId: `c_${Date.now()}` } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer-onboardings"] }); setNewCustomer({ customerName: "", whatsapp: "" }); setTab("customers"); } });
  const pauseResumeMut = useMutation({ mutationFn: async ({ id, action }: { id: string; action: "pause"|"resume" }) => { const { pauseResumeOnboarding } = await import("@/lib/onboarding-flow.functions"); return pauseResumeOnboarding({ data: { onboardingId: id, action } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-onboardings"] }) });
  const saveStepMut = useMutation({ mutationFn: async (step: OnboardingStep) => { const { saveOnboardingStep } = await import("@/lib/onboarding-flow.functions"); return saveOnboardingStep({ data: step }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["onboarding-steps"] }); setEditStep(null); } });

  const active = (onboardings as typeof MOCK_ONBOARDINGS).filter(o => o.status === "active").length;
  const completed = (onboardings as typeof MOCK_ONBOARDINGS).filter(o => o.status === "completed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" /> Customer Onboarding Flow</h1>
          <p className="text-muted-foreground text-sm">Automated welcome sequences — guide new customers step-by-step via WhatsApp</p>
        </div>
        <button onClick={() => setTab("add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Start Onboarding</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{active}</div><div className="text-xs text-green-600">Active</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">{completed}</div><div className="text-xs text-blue-600">Completed</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{steps.filter(s => s.isActive).length}</div><div className="text-xs text-muted-foreground">Active Steps</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{Math.round((completed / Math.max(1, onboardings.length)) * 100)}%</div><div className="text-xs text-muted-foreground">Completion Rate</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["customers","steps","add"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "steps" ? "Onboarding Steps" : t === "add" ? "Start Onboarding" : "Customers"}</button>)}
      </div>

      {tab === "customers" && (
        <div className="space-y-3">
          {(onboardings as typeof MOCK_ONBOARDINGS).map(ob => (
            <div key={ob.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div><div className="flex items-center gap-2 mb-1"><span className="font-semibold">{ob.customerName}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ob.status]}`}>{ob.status}</span></div><div className="text-xs text-muted-foreground">{ob.whatsapp} · Started {new Date(ob.startedAt).toLocaleDateString()}</div></div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium">Step {ob.currentStep}/{ob.totalSteps}</div>
                  {ob.nextMessageAt && ob.status === "active" && <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Next: {new Date(ob.nextMessageAt).toLocaleString()}</div>}
                </div>
              </div>
              <div className="flex gap-1 mb-3">{Array.from({ length: ob.totalSteps }, (_, i) => i + 1).map(n => <div key={n} className={`flex-1 h-2 rounded-full ${ob.completedSteps.includes(n) ? "bg-primary" : ob.currentStep === n ? "bg-primary/40" : "bg-muted"}`} />)}</div>
              <div className="flex gap-2">
                {ob.status === "active" && <button onClick={() => pauseResumeMut.mutate({ id: ob.id, action: "pause" })} className="flex items-center gap-1 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Pause className="h-3.5 w-3.5" />Pause</button>}
                {ob.status === "paused" && <button onClick={() => pauseResumeMut.mutate({ id: ob.id, action: "resume" })} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white rounded text-xs"><Play className="h-3.5 w-3.5" />Resume</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "steps" && (
        <div className="space-y-3">
          {(steps as typeof MOCK_STEPS).map((s, i) => (
            <div key={s.id} className="bg-card border rounded-xl p-4">
              {editStep?.id === s.id ? (
                <div className="space-y-2">
                  <input value={editStep.title} onChange={e => setEditStep(p => p ? { ...p, title: e.target.value } : p)} className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-medium" />
                  <textarea value={editStep.messageTemplate} onChange={e => setEditStep(p => p ? { ...p, messageTemplate: e.target.value } : p)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
                  <div className="flex gap-2"><button onClick={() => saveStepMut.mutate(editStep)} disabled={saveStepMut.isPending} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm">Save</button><button onClick={() => setEditStep(null)} className="px-3 py-1.5 border rounded text-sm">Cancel</button></div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${s.isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s.order}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1"><span className="font-semibold">{s.title}</span><span className="text-xs text-muted-foreground">{s.delayHours === 0 ? "Immediately" : `After ${s.delayHours}h`}</span></div>
                    <div className="text-xs text-muted-foreground mb-1">{s.description}</div>
                    <div className="text-xs bg-muted/40 rounded p-2 font-mono whitespace-pre-line">{s.messageTemplate}</div>
                  </div>
                  <button onClick={() => setEditStep(s)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded">✏️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "add" && (
        <div className="max-w-sm space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Start New Customer Onboarding</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Customer Name</label><input value={newCustomer.customerName} onChange={e => setNewCustomer(p => ({ ...p, customerName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={newCustomer.whatsapp} onChange={e => setNewCustomer(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">Will start 5-step sequence: Welcome → Credentials (2h) → Check-in (24h) → Tips (3d) → Feedback (7d)</div>
            <button onClick={() => startMut.mutate()} disabled={!newCustomer.customerName || !newCustomer.whatsapp || startMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{startMut.isPending ? "Starting…" : "Start Onboarding Flow"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
