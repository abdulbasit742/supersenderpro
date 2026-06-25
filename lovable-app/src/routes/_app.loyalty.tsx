import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, Star, Gift, Users, Share2, Plus, Save, Trash2 } from "lucide-react";
import type { LoyaltyMember, LoyaltyConfig, Reward, LoyaltyTier } from "@/lib/loyalty.functions";

export const Route = createFileRoute("/_app/loyalty")({
  component: LoyaltyPage,
});

type Tab = "members" | "rewards" | "settings";

const TIER_COLORS: Record<LoyaltyTier, { bg: string; text: string; icon: string }> = {
  bronze:   { bg: "bg-amber-100",  text: "text-amber-800",  icon: "🥉" },
  silver:   { bg: "bg-gray-100",   text: "text-gray-700",   icon: "🥈" },
  gold:     { bg: "bg-yellow-100", text: "text-yellow-800", icon: "🥇" },
  platinum: { bg: "bg-purple-100", text: "text-purple-800", icon: "💎" },
};

const MOCK_MEMBERS: LoyaltyMember[] = [
  { id: "1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", points: 6200, tier: "platinum", totalSpend: 45000, referralCode: "AHM001", referralCount: 5, referralEarned: 1000, joinedAt: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: "2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", points: 2800, tier: "gold", totalSpend: 22000, referralCode: "SAR002", referralCount: 2, referralEarned: 400, joinedAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: "3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", points: 780, tier: "silver", totalSpend: 8000, referralCode: "BIL003", referralCount: 1, referralEarned: 200, joinedAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: "4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", points: 250, tier: "bronze", totalSpend: 3200, referralCode: "FAT004", referralCount: 0, referralEarned: 0, joinedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

const MOCK_REWARDS: Reward[] = [
  { id: "r1", name: "Free Delivery", pointsCost: 300, description: "Free delivery on next order", isActive: true },
  { id: "r2", name: "PKR 200 Discount", pointsCost: 500, description: "PKR 200 off on any subscription", isActive: true },
  { id: "r3", name: "1 Month Free", pointsCost: 2000, description: "1 free month of any subscription", isActive: true },
  { id: "r4", name: "VIP Early Access", pointsCost: 1000, description: "Early access to new products", isActive: true },
];

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>("members");
  const [newReward, setNewReward] = useState({ name: "", pointsCost: 500, description: "" });
  const [awardModal, setAwardModal] = useState<{ customerId: string; name: string } | null>(null);
  const [awardPoints, setAwardPoints] = useState(100);
  const qc = useQueryClient();

  const { data: members = MOCK_MEMBERS } = useQuery({
    queryKey: ["loyalty-members"],
    queryFn: async () => { const { getLoyaltyMembers } = await import("@/lib/loyalty.functions"); return getLoyaltyMembers(); },
    placeholderData: MOCK_MEMBERS,
    staleTime: 60_000,
  });

  const { data: rewards = MOCK_REWARDS } = useQuery({
    queryKey: ["loyalty-rewards"],
    queryFn: async () => { const { getRewards } = await import("@/lib/loyalty.functions"); return getRewards(); },
    placeholderData: MOCK_REWARDS,
    staleTime: 60_000,
  });

  const { data: config } = useQuery({
    queryKey: ["loyalty-config"],
    queryFn: async () => { const { getLoyaltyConfig } = await import("@/lib/loyalty.functions"); return getLoyaltyConfig(); },
    placeholderData: { pointsPerPkr: 1, tiers: { bronze: { minPoints: 0, discount: 0, label: "Bronze" }, silver: { minPoints: 500, discount: 5, label: "Silver" }, gold: { minPoints: 2000, discount: 10, label: "Gold" }, platinum: { minPoints: 5000, discount: 15, label: "Platinum" } }, referralBonus: 200, referralDiscount: 150, birthdayBonus: 100 } as LoyaltyConfig,
    staleTime: 300_000,
  });

  const awardMut = useMutation({
    mutationFn: async ({ customerId, points }: { customerId: string; points: number }) => {
      const { awardPoints: fn } = await import("@/lib/loyalty.functions");
      return fn({ data: { customerId, points } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loyalty-members"] }); setAwardModal(null); },
  });

  const saveRewardMut = useMutation({
    mutationFn: async (r: typeof newReward) => {
      const { saveReward } = await import("@/lib/loyalty.functions");
      return saveReward({ data: r });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loyalty-rewards"] }); setNewReward({ name: "", pointsCost: 500, description: "" }); },
  });

  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalReferrals = members.reduce((s, m) => s + m.referralCount, 0);
  const platinumCount = members.filter((m) => m.tier === "platinum").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-6 w-6 text-yellow-500" /> Loyalty & Referral System</h1>
        <p className="text-muted-foreground text-sm">Reward your best customers and grow through referrals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: members.length, icon: Users, color: "bg-blue-100 text-blue-700" },
          { label: "Points Issued", value: totalPoints.toLocaleString(), icon: Star, color: "bg-yellow-100 text-yellow-700" },
          { label: "Platinum VIPs", value: platinumCount, icon: Crown, color: "bg-purple-100 text-purple-700" },
          { label: "Total Referrals", value: totalReferrals, icon: Share2, color: "bg-green-100 text-green-700" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4 flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg grid place-items-center ${color}`}><Icon className="h-5 w-5" /></div>
            <div><div className="text-2xl font-bold">{value}</div><div className="text-sm font-medium">{label}</div></div>
          </div>
        ))}
      </div>

      {/* Tier progress */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Tier Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["bronze","silver","gold","platinum"] as LoyaltyTier[]).map((tier) => {
            const count = members.filter((m) => m.tier === tier).length;
            const t = TIER_COLORS[tier];
            const cfg = config?.tiers[tier];
            return (
              <div key={tier} className={`${t.bg} rounded-xl p-3 text-center`}>
                <div className="text-2xl mb-1">{t.icon}</div>
                <div className={`font-bold text-lg ${t.text}`}>{count}</div>
                <div className={`text-sm font-medium ${t.text}`}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</div>
                <div className={`text-xs ${t.text} opacity-70`}>{cfg?.minPoints}+ pts · {cfg?.discount}% off</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["members","rewards","settings"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>{["Customer","Tier","Points","Spend","Referrals","Code","Action"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const t = TIER_COLORS[m.tier];
                return (
                  <tr key={m.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3"><div className="font-medium">{m.customerName}</div><div className="text-xs text-muted-foreground">{m.whatsapp}</div></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.bg} ${t.text}`}>{t.icon} {m.tier}</span></td>
                    <td className="px-4 py-3 font-mono font-bold">{m.points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">PKR {m.totalSpend.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">{m.referralCount} <span className="text-xs text-muted-foreground">(+{m.referralEarned} pts)</span></td>
                    <td className="px-4 py-3"><code className="bg-muted px-2 py-0.5 rounded text-xs">{m.referralCode}</code></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setAwardModal({ customerId: m.customerId, name: m.customerName ?? "" })} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 flex items-center gap-1">
                        <Star className="h-3 w-3" /> Award
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rewards" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((r) => (
              <div key={r.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-yellow-100 grid place-items-center"><Gift className="h-4 w-4 text-yellow-700" /></div>
                  <span className="text-sm font-bold text-primary">{r.pointsCost} pts</span>
                </div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm text-muted-foreground">{r.description}</div>
              </div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> Add New Reward</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={newReward.name} onChange={(e) => setNewReward((p) => ({ ...p, name: e.target.value }))} placeholder="Reward name" className="px-3 py-2 border rounded-lg text-sm bg-background" />
              <input type="number" value={newReward.pointsCost} onChange={(e) => setNewReward((p) => ({ ...p, pointsCost: Number(e.target.value) }))} placeholder="Points cost" className="px-3 py-2 border rounded-lg text-sm bg-background" />
              <input value={newReward.description} onChange={(e) => setNewReward((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="px-3 py-2 border rounded-lg text-sm bg-background" />
            </div>
            <button onClick={() => saveRewardMut.mutate(newReward)} disabled={!newReward.name || saveRewardMut.isPending} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              <Save className="h-4 w-4" /> Save Reward
            </button>
          </div>
        </div>
      )}

      {tab === "settings" && config && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Points Configuration</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Points per PKR spent</label><input defaultValue={config.pointsPerPkr} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Referral bonus (points)</label><input defaultValue={config.referralBonus} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Referral discount (PKR)</label><input defaultValue={config.referralDiscount} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Birthday bonus (points)</label><input defaultValue={config.birthdayBonus} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Tier Thresholds</h3>
            {(["bronze","silver","gold","platinum"] as LoyaltyTier[]).map((tier) => {
              const t = TIER_COLORS[tier];
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`w-24 text-sm font-medium ${t.text}`}>{t.icon} {tier}</span>
                  <input defaultValue={config.tiers[tier].minPoints} className="w-28 px-3 py-1.5 border rounded text-sm bg-background" placeholder="Min points" />
                  <input defaultValue={config.tiers[tier].discount} className="w-20 px-3 py-1.5 border rounded text-sm bg-background" placeholder="Discount %" />
                  <span className="text-xs text-muted-foreground">% discount</span>
                </div>
              );
            })}
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2"><Save className="h-4 w-4" /> Save Settings</button>
        </div>
      )}

      {/* Award Points Modal */}
      {awardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold">Award Points to {awardModal.name}</h3>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Points to award</label>
              <input type="number" value={awardPoints} onChange={(e) => setAwardPoints(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg bg-background" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAwardModal(null)} className="flex-1 px-3 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={() => awardMut.mutate({ customerId: awardModal.customerId, points: awardPoints })} disabled={awardMut.isPending} className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">Award</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
