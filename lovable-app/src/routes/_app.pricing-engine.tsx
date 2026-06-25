import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tags, Zap, Plus, Save, Trash2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import type { PricingRule, PriceCondition } from "@/lib/pricing-engine.functions";

export const Route = createFileRoute("/_app/pricing-engine")({
  component: PricingEnginePage,
});

type Tab = "rules" | "history" | "flash";

const MOCK_RULES: PricingRule[] = [
  { id: "r1", productId: "p1", productName: "ChatGPT Plus 1 Month", basePrice: 1500, currentPrice: 1500, isActive: true, rules: [{ type: "low_stock", condition: "stock <= 3", adjustment: 10, adjustmentType: "percent", description: "Low stock premium +10%" }, { type: "vip_customer", condition: "is_vip", adjustment: -100, adjustmentType: "flat", description: "VIP discount -PKR 100" }] },
  { id: "r2", productId: "p2", productName: "Claude Pro 1 Month", basePrice: 1800, currentPrice: 1620, isActive: true, rules: [{ type: "flash_sale", condition: "active", adjustment: -10, adjustmentType: "percent", description: "Flash sale -10%" }] },
  { id: "r3", productId: "p3", productName: "LinkedIn Premium", basePrice: 2500, currentPrice: 2500, isActive: false, rules: [] },
];

const CONDITION_TYPES: Array<{ value: PriceCondition["type"]; label: string; example: string }> = [
  { value: "low_stock", label: "Low Stock", example: "When stock ≤ 3 units" },
  { value: "high_demand", label: "High Demand", example: "When orders > 20/day" },
  { value: "vip_customer", label: "VIP Customer", example: "Platinum/Gold tier" },
  { value: "time_of_day", label: "Time of Day", example: "9-21 (rush hours)" },
  { value: "flash_sale", label: "Flash Sale", example: "Manually triggered" },
  { value: "competitor_match", label: "Competitor Match", example: "Auto-match lower price" },
];

export default function PricingEnginePage() {
  const [tab, setTab] = useState<Tab>("rules");
  const [showForm, setShowForm] = useState(false);
  const [flashModal, setFlashModal] = useState<PricingRule | null>(null);
  const [flashDiscount, setFlashDiscount] = useState(10);
  const [flashDuration, setFlashDuration] = useState(60);
  const qc = useQueryClient();

  const [form, setForm] = useState<Partial<PricingRule>>({ productName: "", basePrice: 0, rules: [], isActive: true });

  const { data: rules = MOCK_RULES } = useQuery({
    queryKey: ["pricing-rules"],
    queryFn: async () => { const { getPricingRules } = await import("@/lib/pricing-engine.functions"); return getPricingRules(); },
    placeholderData: MOCK_RULES,
    staleTime: 60_000,
  });

  const saveMut = useMutation({
    mutationFn: async (r: typeof form) => {
      const { savePricingRule } = await import("@/lib/pricing-engine.functions");
      return savePricingRule({ data: { productId: r.productId ?? `p_${Date.now()}`, productName: r.productName ?? "", basePrice: r.basePrice ?? 0, rules: r.rules ?? [], isActive: r.isActive ?? true } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pricing-rules"] }); setShowForm(false); setForm({ productName: "", basePrice: 0, rules: [], isActive: true }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { deletePricingRule } = await import("@/lib/pricing-engine.functions"); return deletePricingRule({ data: { id } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });

  const flashMut = useMutation({
    mutationFn: async ({ rule, discount, duration }: { rule: PricingRule; discount: number; duration: number }) => {
      const { triggerFlashSale } = await import("@/lib/pricing-engine.functions");
      return triggerFlashSale({ data: { productId: rule.productId, discountPercent: discount, durationMinutes: duration } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pricing-rules"] }); setFlashModal(null); },
  });

  const activeRules = rules.filter((r) => r.isActive).length;
  const avgDiscount = rules.flatMap((r) => r.rules).filter((c) => c.adjustment < 0).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tags className="h-6 w-6 text-primary" /> Dynamic Pricing Engine</h1>
          <p className="text-muted-foreground text-sm">Automatically adjust prices based on stock, demand, customer tier, and time</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> New Rule</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Rules", value: activeRules, icon: Tags, color: "bg-blue-100 text-blue-700" },
          { label: "Products Covered", value: rules.length, icon: TrendingUp, color: "bg-green-100 text-green-700" },
          { label: "Discount Rules", value: avgDiscount, icon: TrendingDown, color: "bg-orange-100 text-orange-700" },
          { label: "Flash Sales Today", value: 1, icon: Zap, color: "bg-yellow-100 text-yellow-700" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4 flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg grid place-items-center ${color}`}><Icon className="h-5 w-5" /></div>
            <div><div className="text-2xl font-bold">{value}</div><div className="text-sm font-medium">{label}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["rules","flash","history"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "rules" ? "Pricing Rules" : t === "flash" ? "Flash Sales" : "Price History"}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className={`bg-card border rounded-xl p-4 ${!rule.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{rule.productName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{rule.isActive ? "Active" : "Paused"}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span>Base: <span className="font-mono font-medium text-foreground">PKR {rule.basePrice.toLocaleString()}</span></span>
                    <span>Current: <span className={`font-mono font-medium ${rule.currentPrice < rule.basePrice ? "text-green-600" : rule.currentPrice > rule.basePrice ? "text-orange-600" : "text-foreground"}`}>PKR {rule.currentPrice.toLocaleString()}</span></span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule.rules.map((cond, i) => {
                      const type = CONDITION_TYPES.find((t) => t.value === cond.type);
                      return (
                        <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5 text-xs">
                          <span className="font-medium">{type?.label}</span>
                          <span className={`font-mono font-bold ${cond.adjustment > 0 ? "text-red-600" : "text-green-600"}`}>
                            {cond.adjustment > 0 ? "+" : ""}{cond.adjustmentType === "percent" ? `${cond.adjustment}%` : `PKR ${cond.adjustment}`}
                          </span>
                        </div>
                      );
                    })}
                    {rule.rules.length === 0 && <span className="text-xs text-muted-foreground">No conditions — fixed base price</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFlashModal(rule)} className="px-3 py-1.5 bg-yellow-500 text-white rounded text-xs font-medium flex items-center gap-1 hover:bg-yellow-600"><Zap className="h-3 w-3" /> Flash</button>
                  <button onClick={() => deleteMut.mutate(rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "flash" && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-3"><Zap className="h-4 w-4" /> Active Flash Sales</h3>
            <p className="text-sm text-yellow-700">No active flash sales. Click "Flash" on any product rule to trigger one.</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Products Available for Flash Sale</h3>
            <div className="space-y-2">
              {rules.filter((r) => r.isActive).map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                  <div><div className="font-medium text-sm">{rule.productName}</div><div className="text-xs text-muted-foreground">Base: PKR {rule.basePrice.toLocaleString()}</div></div>
                  <button onClick={() => setFlashModal(rule)} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600 flex items-center gap-1"><Zap className="h-3 w-3" /> Start Flash Sale</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm">Price Change History</span></div>
          <div className="p-4 text-center text-muted-foreground text-sm py-12">
            Price history is tracked when rules fire. Start adjusting prices to see history.
          </div>
        </div>
      )}

      {/* New Rule Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold">New Pricing Rule</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Product Name</label><input value={form.productName ?? ""} onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Base Price (PKR)</label><input type="number" value={form.basePrice ?? 0} onChange={(e) => setForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Add Condition</label>
                {CONDITION_TYPES.map((ct) => (
                  <button key={ct.value} onClick={() => setForm((p) => ({ ...p, rules: [...(p.rules ?? []), { type: ct.value, condition: ct.example, adjustment: -5, adjustmentType: "percent", description: ct.label }] }))} className="block w-full text-left px-3 py-2 hover:bg-muted rounded-lg text-sm mb-1">
                    <span className="font-medium">{ct.label}</span> <span className="text-muted-foreground text-xs">{ct.example}</span>
                  </button>
                ))}
              </div>
              {(form.rules ?? []).map((r, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted rounded-lg p-2">
                  <span className="text-xs flex-1">{r.description}</span>
                  <input type="number" value={r.adjustment} onChange={(e) => setForm((p) => ({ ...p, rules: (p.rules ?? []).map((rr, j) => j === i ? { ...rr, adjustment: Number(e.target.value) } : rr) }))} className="w-20 px-2 py-1 border rounded text-xs bg-background" />
                  <button onClick={() => setForm((p) => ({ ...p, rules: (p.rules ?? []).filter((_, j) => j !== i) }))} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={() => saveMut.mutate(form)} disabled={!form.productName || saveMut.isPending} className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><Save className="h-4 w-4" />{saveMut.isPending ? "Saving…" : "Save Rule"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Flash Sale Modal */}
      {flashModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Flash Sale: {flashModal.productName}</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Discount %</label><input type="number" value={flashDiscount} onChange={(e) => setFlashDiscount(Number(e.target.value))} min={1} max={50} className="w-full px-3 py-2 border rounded-lg bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Duration (minutes)</label><input type="number" value={flashDuration} onChange={(e) => setFlashDuration(Number(e.target.value))} min={15} className="w-full px-3 py-2 border rounded-lg bg-background" /></div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              Sale price: PKR {Math.round(flashModal.basePrice * (1 - flashDiscount / 100)).toLocaleString()} for {flashDuration} minutes
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFlashModal(null)} className="flex-1 px-3 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={() => flashMut.mutate({ rule: flashModal, discount: flashDiscount, duration: flashDuration })} disabled={flashMut.isPending} className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Zap className="h-4 w-4 inline mr-1" />{flashMut.isPending ? "Starting…" : "Start Sale"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
