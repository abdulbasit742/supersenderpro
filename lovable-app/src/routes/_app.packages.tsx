import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Check, X as XIcon, Users } from "lucide-react";
import type { PricingPackage } from "@/lib/packages.functions";

export const Route = createFileRoute("/_app/packages")({
  component: PackagesPage,
});

type Tab = "packages" | "edit";

const MOCK_PACKAGES: PricingPackage[] = [
  { id: "pk1", name: "Starter", tagline: "Chhote resellers ke liye", priceMonthly: 2500, priceAnnual: 25000, color: "blue", maxCustomers: 100, maxMessages: 5000, maxAgents: 2, isPopular: false, isActive: true, subscriberCount: 45, features: [{ label: "100 Customers", included: true }, { label: "5,000 WA Messages", included: true }, { label: "2 Agents", included: true }, { label: "Basic Analytics", included: true }, { label: "Auto-Reply Engine", included: true }, { label: "Chatbot Builder", included: false }, { label: "AI Suggestions", included: false }] },
  { id: "pk2", name: "Pro", tagline: "Growing businesses ke liye — full automation", priceMonthly: 6500, priceAnnual: 65000, color: "purple", maxCustomers: 1000, maxMessages: 50000, maxAgents: 10, isPopular: true, isActive: true, subscriberCount: 123, features: [{ label: "1,000 Customers", included: true }, { label: "50,000 WA Messages", included: true }, { label: "10 Agents", included: true }, { label: "Full Analytics Suite", included: true }, { label: "Auto-Reply Engine", included: true }, { label: "Chatbot Builder", included: true }, { label: "AI Smart Suggestions", included: true }, { label: "Drip Campaigns", included: true }] },
  { id: "pk3", name: "Enterprise", tagline: "Large operations — unlimited + white-label", priceMonthly: 15000, priceAnnual: 150000, color: "gold", maxCustomers: 999999, maxMessages: 999999, maxAgents: 999, isPopular: false, isActive: true, subscriberCount: 12, features: [{ label: "Unlimited Customers", included: true, limit: "∞" }, { label: "Unlimited WA Messages", included: true, limit: "∞" }, { label: "Unlimited Agents", included: true, limit: "∞" }, { label: "White-Label Option", included: true }, { label: "All Pro Features", included: true }, { label: "Dedicated Manager", included: true }, { label: "24/7 Priority Support", included: true }] },
];

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; heading: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-300", badge: "bg-blue-100 text-blue-700", heading: "text-blue-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-400 border-2", badge: "bg-purple-100 text-purple-700", heading: "text-purple-700" },
  gold: { bg: "bg-yellow-50", border: "border-yellow-400", badge: "bg-yellow-100 text-yellow-800", heading: "text-yellow-700" },
};

export default function PackagesPage() {
  const [tab, setTab] = useState<Tab>("packages");
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [editPkg, setEditPkg] = useState<PricingPackage | null>(null);
  const qc = useQueryClient();

  const { data: packages = MOCK_PACKAGES } = useQuery({ queryKey: ["packages"], queryFn: async () => { const { getPackages } = await import("@/lib/packages.functions"); return getPackages(); }, placeholderData: MOCK_PACKAGES, staleTime: 300_000 });

  const toggleMut = useMutation({ mutationFn: async ({ packageId, isActive }: { packageId: string; isActive: boolean }) => { const { togglePackage } = await import("@/lib/packages.functions"); return togglePackage({ data: { packageId, isActive } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["packages"] }) });
  const saveMut = useMutation({ mutationFn: async () => { if (!editPkg) return; const { savePackage } = await import("@/lib/packages.functions"); return savePackage({ data: { id: editPkg.id, name: editPkg.name, priceMonthly: editPkg.priceMonthly, priceAnnual: editPkg.priceAnnual } }); }, onSuccess: () => { setEditPkg(null); setTab("packages"); } });

  const totalSubscribers = (packages as typeof MOCK_PACKAGES).reduce((s, p) => s + p.subscriberCount, 0);
  const totalMRR = (packages as typeof MOCK_PACKAGES).reduce((s, p) => s + p.subscriberCount * p.priceMonthly, 0);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6 text-primary" /> Pricing Packages</h1><p className="text-muted-foreground text-sm">Design and manage your reseller service tiers — Starter, Pro, Enterprise</p></div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">PKR {(totalMRR/1000).toFixed(0)}K</div><div className="text-xs text-green-600">Monthly Recurring Revenue</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="flex items-center justify-center gap-1"><Users className="h-5 w-5 text-primary" /><div className="text-2xl font-bold">{totalSubscribers}</div></div><div className="text-xs text-muted-foreground">Total Subscribers</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{packages.filter(p => p.isActive).length}</div><div className="text-xs text-muted-foreground">Active Plans</div></div>
      </div>

      <div className="flex gap-1 border-b items-center">
        {(["packages","edit"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "edit" ? "Edit Package" : "Plans"}</button>)}
        <div className="ml-auto flex items-center gap-2 text-sm"><span className={!billingAnnual ? "font-medium" : "text-muted-foreground"}>Monthly</span><button onClick={() => setBillingAnnual(p => !p)} className={`relative h-6 w-11 rounded-full transition-colors ${billingAnnual ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${billingAnnual ? "translate-x-5" : "translate-x-0.5"}`} /></button><span className={billingAnnual ? "font-medium" : "text-muted-foreground"}>Annual <span className="text-green-600 text-xs">(2 months free)</span></span></div>
      </div>

      {tab === "packages" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(packages as typeof MOCK_PACKAGES).map(pkg => {
            const c = COLOR_MAP[pkg.color] ?? COLOR_MAP.blue;
            const price = billingAnnual ? Math.round(pkg.priceAnnual / 12) : pkg.priceMonthly;
            return (
              <div key={pkg.id} className={`${c.bg} border ${c.border} rounded-2xl p-5 relative ${!pkg.isActive ? "opacity-60" : ""}`}>
                {pkg.isPopular && <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${c.badge} rounded-full text-xs font-bold`}>⭐ Most Popular</div>}
                <div className="mb-4"><div className={`font-bold text-xl ${c.heading}`}>{pkg.name}</div><div className="text-xs text-muted-foreground mt-0.5">{pkg.tagline}</div></div>
                <div className="mb-4"><div className="flex items-end gap-1"><span className="text-3xl font-black">PKR {price.toLocaleString()}</span><span className="text-muted-foreground text-sm">/mo</span></div>{billingAnnual && <div className="text-xs text-green-600">Billed PKR {pkg.priceAnnual.toLocaleString()} annually</div>}</div>
                <div className="space-y-1.5 mb-4">{pkg.features.map((f, i) => <div key={i} className="flex items-center gap-2 text-sm">{f.included ? <Check className="h-4 w-4 text-green-600 shrink-0" /> : <XIcon className="h-4 w-4 text-muted-foreground shrink-0" />}<span className={f.included ? "" : "text-muted-foreground"}>{f.label}{f.limit && ` (${f.limit})`}</span></div>)}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3"><span>{pkg.subscriberCount} subscribers</span><span>PKR {(pkg.subscriberCount * pkg.priceMonthly / 1000).toFixed(0)}K/mo</span></div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditPkg(pkg); setTab("edit"); }} className="flex-1 py-1.5 border rounded-lg text-xs hover:bg-white/50">Edit Pricing</button>
                  <button onClick={() => toggleMut.mutate({ packageId: pkg.id, isActive: !pkg.isActive })} className={`px-3 py-1.5 rounded-lg text-xs ${pkg.isActive ? "text-orange-600 border border-orange-200 hover:bg-orange-50" : "text-green-600 border border-green-200 hover:bg-green-50"}`}>{pkg.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "edit" && editPkg && (
        <div className="max-w-sm bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Edit {editPkg.name} Package</h3>
          <div><label className="text-xs text-muted-foreground block mb-1">Package Name</label><input value={editPkg.name} onChange={e => setEditPkg(p => p ? { ...p, name: e.target.value } : p)} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground block mb-1">Monthly Price (PKR)</label><input type="number" value={editPkg.priceMonthly} onChange={e => setEditPkg(p => p ? { ...p, priceMonthly: +e.target.value } : p)} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Annual Price (PKR)</label><input type="number" value={editPkg.priceAnnual} onChange={e => setEditPkg(p => p ? { ...p, priceAnnual: +e.target.value } : p)} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          </div>
          <div className="flex gap-2"><button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm">{saveMut.isPending ? "Saving…" : "Save"}</button><button onClick={() => { setEditPkg(null); setTab("packages"); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button></div>
        </div>
      )}
    </div>
  );
}
