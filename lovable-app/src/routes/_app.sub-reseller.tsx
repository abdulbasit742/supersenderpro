import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Handshake, Plus, Send, Check, DollarSign, Users, TrendingUp } from "lucide-react";
import type { SubReseller, CommissionRecord } from "@/lib/sub-reseller.functions";

export const Route = createFileRoute("/_app/sub-reseller")({
  component: SubResellerPage,
});

type Tab = "resellers" | "commissions" | "invite";

const MOCK_RESELLERS: SubReseller[] = [
  { id: "r1", name: "Hassan Traders", whatsapp: "03001111111", commissionRate: 15, totalOrders: 47, totalRevenue: 187000, totalCommission: 28050, pendingCommission: 5400, status: "active", joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(), referralCode: "HASSAN15" },
  { id: "r2", name: "Digital Zone PK", whatsapp: "03112222222", commissionRate: 12, totalOrders: 28, totalRevenue: 98000, totalCommission: 11760, pendingCommission: 2400, status: "active", joinedAt: new Date(Date.now() - 14 * 86400000).toISOString(), referralCode: "DZONE12" },
  { id: "r3", name: "Ali Tech", whatsapp: "03213333333", commissionRate: 10, totalOrders: 5, totalRevenue: 18500, totalCommission: 1850, pendingCommission: 1850, status: "pending", joinedAt: new Date(Date.now() - 3 * 86400000).toISOString(), referralCode: "ALITECH10" },
];
const MOCK_COMMISSIONS: CommissionRecord[] = [
  { id: "c1", resellerId: "r1", resellerName: "Hassan Traders", orderId: "o1", product: "ChatGPT Plus", saleAmount: 4200, commissionRate: 15, commissionAmount: 630, status: "pending", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "c2", resellerId: "r2", resellerName: "Digital Zone PK", orderId: "o3", product: "LinkedIn Premium", saleAmount: 5500, commissionRate: 12, commissionAmount: 660, status: "pending", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "c3", resellerId: "r1", resellerName: "Hassan Traders", orderId: "o2", product: "Claude Pro", saleAmount: 3500, commissionRate: 15, commissionAmount: 525, status: "paid", createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
];

const STATUS_COLORS = { active: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", suspended: "bg-red-100 text-red-700" };
const COM_STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-700", paid: "bg-green-100 text-green-700", cancelled: "bg-gray-100 text-gray-500" };

export default function SubResellerPage() {
  const [tab, setTab] = useState<Tab>("resellers");
  const [inviteForm, setInviteForm] = useState({ name: "", whatsapp: "", commissionRate: 15 });
  const [selected, setSelected] = useState<string[]>([]);
  const [inviteResult, setInviteResult] = useState<{ code: string; link: string } | null>(null);
  const qc = useQueryClient();

  const { data: resellers = MOCK_RESELLERS } = useQuery({ queryKey: ["sub-resellers"], queryFn: async () => { const { getSubResellers } = await import("@/lib/sub-reseller.functions"); return getSubResellers(); }, placeholderData: MOCK_RESELLERS, staleTime: 60_000 });
  const { data: commissions = MOCK_COMMISSIONS } = useQuery({ queryKey: ["commissions"], queryFn: async () => { const { getCommissions } = await import("@/lib/sub-reseller.functions"); return getCommissions({ data: {} }); }, placeholderData: MOCK_COMMISSIONS, staleTime: 60_000 });

  const inviteMut = useMutation({
    mutationFn: async () => { const { inviteReseller } = await import("@/lib/sub-reseller.functions"); return inviteReseller({ data: { whatsapp: inviteForm.whatsapp, commissionRate: inviteForm.commissionRate } }); },
    onSuccess: (r) => { setInviteResult({ code: (r as { inviteCode?: string }).inviteCode ?? "", link: "" }); qc.invalidateQueries({ queryKey: ["sub-resellers"] }); },
  });

  const payMut = useMutation({
    mutationFn: async () => { const { markCommissionPaid } = await import("@/lib/sub-reseller.functions"); return markCommissionPaid({ data: { commissionIds: selected } }); },
    onSuccess: () => { setSelected([]); qc.invalidateQueries({ queryKey: ["commissions"] }); },
  });

  const totalPending = (commissions as typeof MOCK_COMMISSIONS).filter(c => c.status === "pending").reduce((s, c) => s + c.commissionAmount, 0);
  const totalPaid = (commissions as typeof MOCK_COMMISSIONS).filter(c => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Handshake className="h-6 w-6 text-primary" /> Sub-Reseller Panel</h1>
          <p className="text-muted-foreground text-sm">Manage your reseller network, track commissions, and process payouts</p>
        </div>
        <button onClick={() => setTab("invite")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Invite Reseller</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-primary">{resellers.filter(r => r.status === "active").length}</div><div className="text-xs text-muted-foreground">Active Resellers</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">PKR {((resellers as typeof MOCK_RESELLERS).reduce((s, r) => s + r.totalRevenue, 0) / 1000).toFixed(0)}K</div><div className="text-xs text-green-600">Total Revenue</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-700">PKR {(totalPending / 1000).toFixed(1)}K</div><div className="text-xs text-orange-600">Pending Payouts</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">PKR {(totalPaid / 1000).toFixed(0)}K</div><div className="text-xs text-blue-600">Total Paid</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["resellers","commissions","invite"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "resellers" ? "Resellers" : t === "commissions" ? "Commissions" : "Invite"}
          </button>
        ))}
      </div>

      {tab === "resellers" && (
        <div className="space-y-3">
          {(resellers as typeof MOCK_RESELLERS).map(r => (
            <div key={r.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{r.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></div>
                  <div className="text-xs text-muted-foreground font-mono mb-2">{r.whatsapp} · Code: <strong>{r.referralCode}</strong></div>
                  <div className="flex gap-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Commission</span><div className="font-bold text-green-600">{r.commissionRate}%</div></div>
                    <div><span className="text-muted-foreground text-xs">Orders</span><div className="font-bold">{r.totalOrders}</div></div>
                    <div><span className="text-muted-foreground text-xs">Revenue</span><div className="font-bold">PKR {(r.totalRevenue / 1000).toFixed(0)}K</div></div>
                    <div><span className="text-muted-foreground text-xs">Pending</span><div className="font-bold text-orange-600">PKR {r.pendingCommission.toLocaleString()}</div></div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">Pay PKR {r.pendingCommission.toLocaleString()}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "commissions" && (
        <div className="space-y-3">
          {selected.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{selected.length} selected · PKR {(commissions as typeof MOCK_COMMISSIONS).filter(c => selected.includes(c.id)).reduce((s, c) => s + c.commissionAmount, 0).toLocaleString()} total</span>
              <button onClick={() => payMut.mutate()} disabled={payMut.isPending} className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Check className="h-3.5 w-3.5" />Mark All Paid</button>
            </div>
          )}
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30"><tr><th className="px-4 py-2 w-8"></th>{["Reseller","Product","Sale","Commission","Status","Date"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {(commissions as typeof MOCK_COMMISSIONS).map(c => (
                  <tr key={c.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(p => e.target.checked ? [...p, c.id] : p.filter(id => id !== c.id))} className="rounded" /></td>
                    <td className="px-4 py-3 font-medium">{c.resellerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.product}</td>
                    <td className="px-4 py-3">PKR {c.saleAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-green-600">PKR {c.commissionAmount.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">({c.commissionRate}%)</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COM_STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "invite" && (
        <div className="max-w-md space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Invite a New Reseller</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Reseller Name</label><input value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Hassan Traders" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={inviteForm.whatsapp} onChange={e => setInviteForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Commission Rate (%)</label><div className="flex gap-2">{[10, 12, 15, 20].map(r => <button key={r} onClick={() => setInviteForm(p => ({ ...p, commissionRate: r }))} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${inviteForm.commissionRate === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{r}%</button>)}</div></div>
            <button onClick={() => inviteMut.mutate()} disabled={!inviteForm.name || !inviteForm.whatsapp || inviteMut.isPending} className="w-full px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><Send className="h-4 w-4" />{inviteMut.isPending ? "Sending…" : "Send Invite via WhatsApp"}</button>
            {inviteResult && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700"><Check className="h-4 w-4 inline mr-2" />Invite sent! Code: <strong className="font-mono">{inviteResult.code}</strong></div>}
          </div>
        </div>
      )}
    </div>
  );
}
