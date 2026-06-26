import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Play, Pause, Plus, UserPlus } from "lucide-react";
import type { DripCampaign, DripEnrollment } from "@/lib/drip-campaigns.functions";

export const Route = createFileRoute("/_app/drip-campaigns")({
  component: DripCampaignsPage,
});

type Tab = "campaigns" | "enrollments" | "create";

const MOCK_CAMPAIGNS: DripCampaign[] = [
  { id: "dc1", name: "New Customer Welcome Drip", description: "7-day welcome sequence for all new buyers", triggerType: "signup", isActive: true, enrolledCount: 234, completedCount: 156, convertedCount: 89, steps: [{ id: "s1", order: 1, delayDays: 0, delayHours: 0, messageTemplate: "🎉 Welcome {{name}}! Aapka {{product}} ready hai!", condition: "always" }, { id: "s2", order: 2, delayDays: 1, delayHours: 0, messageTemplate: "{{name}}, {{product}} theek chal raha hai? 😊", condition: "if_no_reply" }, { id: "s3", order: 3, delayDays: 3, delayHours: 0, messageTemplate: "💡 Pro Tip for {{product}} users...", condition: "always" }, { id: "s4", order: 4, delayDays: 7, delayHours: 0, messageTemplate: "Ek hafte ho gaya! Rate us 1-10 🙏", condition: "always" }], createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "dc2", name: "Renewal Reminder Drip", description: "3-message renewal push before expiry", triggerType: "renewal_due", isActive: true, enrolledCount: 89, completedCount: 45, convertedCount: 67, steps: [{ id: "s5", order: 1, delayDays: -7, delayHours: 0, messageTemplate: "⚠️ {{name}}, 7 din mein expire hoga!", condition: "always" }, { id: "s6", order: 2, delayDays: -3, delayHours: 0, messageTemplate: "🔔 Sirf 3 din baaki! Reply: RENEW", condition: "if_no_reply" }, { id: "s7", order: 3, delayDays: -1, delayHours: 0, messageTemplate: "⚡ LAST CHANCE! Kal expire hoga!", condition: "if_no_reply" }], createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "dc3", name: "Win-Back Inactive", description: "Re-engage inactive 30+ day customers", triggerType: "inactivity", isActive: false, enrolledCount: 56, completedCount: 12, convertedCount: 8, steps: [{ id: "s8", order: 1, delayDays: 0, delayHours: 0, messageTemplate: "{{name}} bhai, kaisa haal? 😊", condition: "always" }, { id: "s9", order: 2, delayDays: 3, delayHours: 0, messageTemplate: "🎁 Special 15% discount sirf aaj!", condition: "if_no_reply" }], createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];
const MOCK_ENROLLMENTS: DripEnrollment[] = [
  { id: "de1", campaignId: "dc1", campaignName: "New Customer Welcome Drip", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", currentStep: 2, status: "active", startedAt: new Date(Date.now() - 86400000).toISOString(), nextMessageAt: new Date(Date.now() + 2 * 86400000).toISOString() },
  { id: "de2", campaignId: "dc1", campaignName: "New Customer Welcome Drip", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", currentStep: 4, status: "completed", startedAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: "de3", campaignId: "dc2", campaignName: "Renewal Reminder Drip", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", currentStep: 1, status: "converted", startedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];

const TRIGGER_LABELS: Record<string, string> = { signup: "New Customer", purchase: "Purchase", renewal_due: "Renewal Due", inactivity: "Inactivity", manual: "Manual" };
const STATUS_COLORS: Record<string, string> = { active: "bg-green-100 text-green-700", completed: "bg-blue-100 text-blue-700", converted: "bg-yellow-100 text-yellow-700", unsubscribed: "bg-gray-100 text-gray-600" };
const COND_LABELS: Record<string, string> = { always: "Always", if_no_reply: "If No Reply", if_not_converted: "If Not Converted" };

export default function DripCampaignsPage() {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", triggerType: "signup" });
  const [enrollForm, setEnrollForm] = useState({ campaignId: "dc1", customerName: "", whatsapp: "" });
  const qc = useQueryClient();

  const { data: campaigns = MOCK_CAMPAIGNS } = useQuery({ queryKey: ["drip-campaigns"], queryFn: async () => { const { getDripCampaigns } = await import("@/lib/drip-campaigns.functions"); return getDripCampaigns(); }, placeholderData: MOCK_CAMPAIGNS, staleTime: 60_000 });
  const { data: enrollments = MOCK_ENROLLMENTS } = useQuery({ queryKey: ["drip-enrollments"], queryFn: async () => { const { getDripEnrollments } = await import("@/lib/drip-campaigns.functions"); return getDripEnrollments({ data: {} }); }, placeholderData: MOCK_ENROLLMENTS, staleTime: 30_000 });

  const toggleMut = useMutation({ mutationFn: async ({ campaignId, isActive }: { campaignId: string; isActive: boolean }) => { const { toggleDripCampaign } = await import("@/lib/drip-campaigns.functions"); return toggleDripCampaign({ data: { campaignId, isActive } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["drip-campaigns"] }) });
  const saveMut = useMutation({ mutationFn: async () => { const { saveDripCampaign } = await import("@/lib/drip-campaigns.functions"); return saveDripCampaign({ data: { ...newCampaign } }); }, onSuccess: () => { setTab("campaigns"); setNewCampaign({ name: "", description: "", triggerType: "signup" }); } });
  const enrollMut = useMutation({ mutationFn: async () => { const { enrollCustomer } = await import("@/lib/drip-campaigns.functions"); return enrollCustomer({ data: { ...enrollForm, customerId: `c_${Date.now()}` } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["drip-enrollments"] }); setEnrollForm(p => ({ ...p, customerName: "", whatsapp: "" })); } });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6 text-primary" /> Drip Campaigns</h1><p className="text-muted-foreground text-sm">Multi-step WhatsApp sequences — automated follow-ups over days/weeks</p></div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />New Campaign</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{campaigns.filter(c => c.isActive).length}</div><div className="text-xs text-muted-foreground">Active</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{(campaigns as typeof MOCK_CAMPAIGNS).reduce((s, c) => s + c.enrolledCount, 0)}</div><div className="text-xs text-green-600">Enrolled</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">{(campaigns as typeof MOCK_CAMPAIGNS).reduce((s, c) => s + c.convertedCount, 0)}</div><div className="text-xs text-blue-600">Converted</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{Math.round((campaigns as typeof MOCK_CAMPAIGNS).reduce((s, c) => s + c.convertedCount, 0) / Math.max(1, (campaigns as typeof MOCK_CAMPAIGNS).reduce((s, c) => s + c.enrolledCount, 0)) * 100)}%</div><div className="text-xs text-muted-foreground">Conversion Rate</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["campaigns","enrollments","create"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "create" ? "Create" : t === "enrollments" ? "Enrollments" : "Campaigns"}</button>)}
      </div>

      {tab === "campaigns" && (
        <div className="space-y-4">
          {(campaigns as typeof MOCK_CAMPAIGNS).map(campaign => (
            <div key={campaign.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-bold">{campaign.name}</span><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{TRIGGER_LABELS[campaign.triggerType]}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${campaign.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{campaign.isActive ? "Active" : "Paused"}</span></div>
                  <div className="text-sm text-muted-foreground">{campaign.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right text-xs text-muted-foreground"><div>{campaign.enrolledCount} enrolled</div><div>{campaign.convertedCount} converted</div></div>
                  <button onClick={() => toggleMut.mutate({ campaignId: campaign.id, isActive: !campaign.isActive })} className={`p-1.5 rounded border ${campaign.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}`}>{campaign.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {campaign.steps.map((step, si) => <div key={step.id} className="flex items-center gap-1 shrink-0"><div className="bg-muted/50 border rounded-lg px-2 py-1 text-xs"><div className="font-medium">{step.delayDays === 0 ? "Day 0" : `Day ${step.delayDays}`}</div><div className="text-muted-foreground">{COND_LABELS[step.condition ?? "always"]}</div></div>{si < campaign.steps.length - 1 && <span className="text-muted-foreground text-xs">→</span>}</div>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "enrollments" && (
        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-3 space-y-2">
            <h3 className="font-medium text-sm">Enroll a Customer</h3>
            <div className="flex gap-2">
              <select value={enrollForm.campaignId} onChange={e => setEnrollForm(p => ({ ...p, campaignId: e.target.value }))} className="flex-1 px-2 py-1.5 border rounded text-sm bg-background">{(campaigns as typeof MOCK_CAMPAIGNS).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input value={enrollForm.customerName} onChange={e => setEnrollForm(p => ({ ...p, customerName: e.target.value }))} placeholder="Customer Name" className="flex-1 px-2 py-1.5 border rounded text-sm bg-background" />
              <input value={enrollForm.whatsapp} onChange={e => setEnrollForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-36 px-2 py-1.5 border rounded text-sm bg-background" />
              <button onClick={() => enrollMut.mutate()} disabled={!enrollForm.customerName || !enrollForm.whatsapp || enrollMut.isPending} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm"><UserPlus className="h-3.5 w-3.5" />Enroll</button>
            </div>
          </div>
          {(enrollments as typeof MOCK_ENROLLMENTS).map(e => (
            <div key={e.id} className="bg-card border rounded-xl p-3 flex items-center justify-between gap-3">
              <div><div className="font-medium text-sm">{e.customerName}</div><div className="text-xs text-muted-foreground">{e.whatsapp} · {e.campaignName} · Step {e.currentStep}</div>{e.nextMessageAt && <div className="text-xs text-primary">Next: {new Date(e.nextMessageAt).toLocaleDateString()}</div>}</div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[e.status]}`}>{e.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-lg bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Create Drip Campaign</h3>
          <div><label className="text-xs text-muted-foreground block mb-1">Campaign Name</label><input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Description</label><input value={newCampaign.description} onChange={e => setNewCampaign(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Trigger</label><select value={newCampaign.triggerType} onChange={e => setNewCampaign(p => ({ ...p, triggerType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{Object.entries(TRIGGER_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">After creating, edit steps from the campaign detail view. Default: 4-step welcome sequence.</div>
          <button onClick={() => saveMut.mutate()} disabled={!newCampaign.name || saveMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{saveMut.isPending ? "Creating…" : "Create Campaign"}</button>
        </div>
      )}
    </div>
  );
}
