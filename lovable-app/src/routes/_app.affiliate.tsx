import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link2, Plus, Copy, Send, Save, DollarSign, TrendingUp, Users } from "lucide-react";
import type { Affiliate, AffiliateConfig } from "@/lib/affiliate.functions";

export const Route = createFileRoute("/_app/affiliate")({
  component: AffiliatePage,
});

type Tab = "affiliates" | "invite" | "settings";

const MOCK_AFFILIATES: Affiliate[] = [
  { id: "af1", name: "Tech Blogger PK", whatsapp: "03001111111", referralCode: "TECH20", referralLink: "https://supersenderpro.com/ref/TECH20", commissionRate: 20, totalClicks: 234, totalSignups: 45, totalOrders: 28, totalEarned: 32400, pendingPayout: 8400, status: "active", joinedAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: "af2", name: "YouTube Creator", whatsapp: "03112222222", referralCode: "YOUTUBER15", referralLink: "https://supersenderpro.com/ref/YOUTUBER15", commissionRate: 15, totalClicks: 567, totalSignups: 89, totalOrders: 41, totalEarned: 28700, pendingPayout: 4200, status: "active", joinedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "af3", name: "Social Media PK", whatsapp: "03213333333", referralCode: "SOCIAL10", referralLink: "https://supersenderpro.com/ref/SOCIAL10", commissionRate: 10, totalClicks: 89, totalSignups: 12, totalOrders: 5, totalEarned: 3500, pendingPayout: 3500, status: "paused", joinedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
];
const MOCK_CONFIG: AffiliateConfig = { baseUrl: "https://supersenderpro.com/ref", defaultCommissionRate: 20, cookieDays: 30, minPayoutAmount: 1000, payoutMethod: "JazzCash / EasyPaisa", termsText: "Earn 20% commission on every successful sale you refer.", isActive: true };

const STATUS_COLORS = { active: "bg-green-100 text-green-700", paused: "bg-yellow-100 text-yellow-700", suspended: "bg-red-100 text-red-700" };

export default function AffiliatePage() {
  const [tab, setTab] = useState<Tab>("affiliates");
  const [inviteForm, setInviteForm] = useState({ name: "", whatsapp: "", commissionRate: 20 });
  const [config, setConfig] = useState<AffiliateConfig>(MOCK_CONFIG);
  const [copied, setCopied] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ code: string; link: string } | null>(null);
  const qc = useQueryClient();

  const { data: affiliates = MOCK_AFFILIATES } = useQuery({ queryKey: ["affiliates"], queryFn: async () => { const { getAffiliates } = await import("@/lib/affiliate.functions"); return getAffiliates(); }, placeholderData: MOCK_AFFILIATES, staleTime: 60_000 });
  const { data: savedConfig = MOCK_CONFIG } = useQuery({ queryKey: ["affiliate-config"], queryFn: async () => { const { getAffiliateConfig } = await import("@/lib/affiliate.functions"); return getAffiliateConfig(); }, placeholderData: MOCK_CONFIG, staleTime: 300_000 });

  const inviteMut = useMutation({
    mutationFn: async () => { const { inviteAffiliate } = await import("@/lib/affiliate.functions"); return inviteAffiliate({ data: inviteForm }); },
    onSuccess: (r) => { setInviteResult({ code: (r as { code?: string }).code ?? "", link: (r as { link?: string }).link ?? "" }); qc.invalidateQueries({ queryKey: ["affiliates"] }); },
  });
  const payoutMut = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => { const { processAffiliatePayout } = await import("@/lib/affiliate.functions"); return processAffiliatePayout({ data: { affiliateId: id, amount } }); },
  });
  const saveConfigMut = useMutation({
    mutationFn: async () => { const { saveAffiliateConfig } = await import("@/lib/affiliate.functions"); return saveAffiliateConfig({ data: config as unknown as Record<string, unknown> }); },
  });

  const copy = (text: string, id: string) => { void navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const totalPending = (affiliates as typeof MOCK_AFFILIATES).reduce((s, a) => s + a.pendingPayout, 0);
  const totalEarned = (affiliates as typeof MOCK_AFFILIATES).reduce((s, a) => s + a.totalEarned, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Link2 className="h-6 w-6 text-primary" /> Affiliate Program</h1>
          <p className="text-muted-foreground text-sm">Manage referral partners, track conversions, process commission payouts</p>
        </div>
        <button onClick={() => setTab("invite")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Add Affiliate</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">{affiliates.filter(a => a.status === "active").length}</div><div className="text-xs text-muted-foreground">Active Affiliates</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-blue-700">{(affiliates as typeof MOCK_AFFILIATES).reduce((s,a)=>s+a.totalClicks,0)}</div><div className="text-xs text-blue-600">Total Clicks</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-orange-700">PKR {(totalPending/1000).toFixed(1)}K</div><div className="text-xs text-orange-600">Pending Payouts</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">PKR {(totalEarned/1000).toFixed(0)}K</div><div className="text-xs text-green-600">Total Earned</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["affiliates","invite","settings"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "affiliates" ? "Affiliates" : t === "invite" ? "Add Affiliate" : "Program Settings"}</button>)}
      </div>

      {tab === "affiliates" && (
        <div className="space-y-3">
          {(affiliates as typeof MOCK_AFFILIATES).map(a => (
            <div key={a.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{a.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></div>
                  <div className="text-xs text-muted-foreground mb-2">{a.whatsapp} · {a.commissionRate}% commission</div>
                  <div className="flex items-center gap-2 mb-3 bg-muted rounded-lg px-2 py-1">
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-xs">{a.referralLink}</span>
                    <button onClick={() => copy(a.referralLink, a.id)} className="shrink-0 p-1 hover:bg-accent rounded"><Copy className="h-3.5 w-3.5" /></button>
                    {copied === a.id && <span className="text-xs text-green-600">Copied!</span>}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Clicks</span><div className="font-bold">{a.totalClicks}</div></div>
                    <div><span className="text-muted-foreground text-xs">Signups</span><div className="font-bold">{a.totalSignups}</div></div>
                    <div><span className="text-muted-foreground text-xs">Orders</span><div className="font-bold">{a.totalOrders}</div></div>
                    <div><span className="text-muted-foreground text-xs">Earned</span><div className="font-bold text-green-600">PKR {a.totalEarned.toLocaleString()}</div></div>
                    <div><span className="text-muted-foreground text-xs">Pending</span><div className="font-bold text-orange-600">PKR {a.pendingPayout.toLocaleString()}</div></div>
                  </div>
                </div>
                {a.pendingPayout >= (savedConfig.minPayoutAmount) && (
                  <button onClick={() => payoutMut.mutate({ id: a.id, amount: a.pendingPayout })} disabled={payoutMut.isPending} className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"><DollarSign className="h-3.5 w-3.5" />Pay PKR {a.pendingPayout.toLocaleString()}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "invite" && (
        <div className="max-w-md space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Invite New Affiliate</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Name</label><input value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Tech Blogger PK" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={inviteForm.whatsapp} onChange={e => setInviteForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Commission Rate</label><div className="flex gap-2">{[10,15,20,25].map(r => <button key={r} onClick={() => setInviteForm(p => ({ ...p, commissionRate: r }))} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${inviteForm.commissionRate === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{r}%</button>)}</div></div>
            <button onClick={() => inviteMut.mutate()} disabled={!inviteForm.name || !inviteForm.whatsapp || inviteMut.isPending} className="w-full px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><Send className="h-4 w-4" />{inviteMut.isPending ? "Sending…" : "Send Affiliate Invite"}</button>
            {inviteResult && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Invite sent! Code: <strong className="font-mono">{inviteResult.code}</strong></div>}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Affiliate Program</h3><button onClick={() => setConfig(p => ({ ...p, isActive: !p.isActive }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.isActive ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.isActive ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            {[["Base URL","baseUrl"],["Payout Method","payoutMethod"],["Terms Text","termsText"]].map(([label, key]) => (
              <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label><input value={(config as Record<string, string>)[key]} onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Default %</label><input type="number" value={config.defaultCommissionRate} onChange={e => setConfig(p => ({ ...p, defaultCommissionRate: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Cookie Days</label><input type="number" value={config.cookieDays} onChange={e => setConfig(p => ({ ...p, cookieDays: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Min Payout PKR</label><input type="number" value={config.minPayoutAmount} onChange={e => setConfig(p => ({ ...p, minPayoutAmount: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm bg-background" /></div>
            </div>
          </div>
          <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />Save Settings</button>
        </div>
      )}
    </div>
  );
}
