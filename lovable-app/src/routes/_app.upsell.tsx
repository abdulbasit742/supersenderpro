import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Toggle, Skeleton } from "@/components/ui-kit";
import {
  TrendingUp, Zap, ShoppingCart, BadgeDollarSign,
  Percent, Plus, Trash2, RefreshCw, Save, ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UpsellRule, UpsellStats, UpsellLog } from "@/lib/upsell.functions";

export const Route = createFileRoute("/_app/upsell")({
  component: UpsellPage,
});

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATS: UpsellStats = { totalAttempts: 38, conversions: 11, conversionRate: 29, revenueGenerated: 18700 };

const MOCK_RULES: UpsellRule[] = [
  { id: "r1", name: "ChatGPT → Claude",       triggerProduct: "ChatGPT Plus", suggestProduct: "Claude Pro",       suggestPrice: 1700, delayMinutes: 5,   messageTemplate: "Salam {{name}}! ChatGPT Plus lene ke baad, Claude Pro bhi try karein — PKR {{price}} mein. Reply karein!",          isActive: true },
  { id: "r2", name: "SSD → RAM Bundle",        triggerProduct: "SSD 512GB",    suggestProduct: "RAM 8GB DDR4",     suggestPrice: 4500, delayMinutes: 60,  messageTemplate: "{{name}} bhai, SSD ke saath RAM upgrade bhi karein — PKR {{price}}. Limited stock!",                               isActive: true },
  { id: "r3", name: "Laptop → Accessories",    triggerProduct: "Laptop",       suggestProduct: "Wireless Keyboard",suggestPrice: 3200, delayMinutes: 1440,messageTemplate: "Aapka laptop deliver ho gaya! Complete setup ke liye wireless keyboard le lein — PKR {{price}}. Reply 'YES' karein.", isActive: false },
];

const MOCK_LOGS: UpsellLog[] = [
  { id: "l1", orderId: "o1", customerId: "c1", customerName: "Ali Hassan",   ruleId: "r1", ruleName: "ChatGPT → Claude",    status: "converted", sentAt: new Date(Date.now() - 3600000).toISOString(),  revenue: 1700 },
  { id: "l2", orderId: "o2", customerId: "c2", customerName: "Sara Ahmed",   ruleId: "r1", ruleName: "ChatGPT → Claude",    status: "sent",      sentAt: new Date(Date.now() - 7200000).toISOString(),  revenue: 0 },
  { id: "l3", orderId: "o3", customerId: "c3", customerName: "Bilal Raza",   ruleId: "r2", ruleName: "SSD → RAM Bundle",     status: "converted", sentAt: new Date(Date.now() - 10800000).toISOString(), revenue: 4500 },
  { id: "l4", orderId: "o4", customerId: "c4", customerName: "Zara Khan",    ruleId: "r1", ruleName: "ChatGPT → Claude",    status: "ignored",   sentAt: new Date(Date.now() - 18000000).toISOString(), revenue: 0 },
  { id: "l5", orderId: "o5", customerId: "c5", customerName: "Usman Malik",  ruleId: "r3", ruleName: "Laptop → Accessories", status: "converted", sentAt: new Date(Date.now() - 86400000).toISOString(),  revenue: 3200 },
];

const PRODUCT_OPTIONS = [
  "ChatGPT Plus", "Claude Pro", "SSD 512GB", "RAM 8GB DDR4", "Hard Disk 1TB",
  "Dell Latitude 7490", "HP EliteBook 840", "Wireless Keyboard", "Wireless Mouse",
  "Almonds 1kg", "Cashew 500g", "Casual Shirt M", "Fajita Large",
];

const DELAY_OPTIONS = [
  { value: 5,    label: "5 minutes" },
  { value: 30,   label: "30 minutes" },
  { value: 60,   label: "1 hour" },
  { value: 360,  label: "6 hours" },
  { value: 1440, label: "24 hours" },
];

type Tab = "rules" | "logs" | "new";

// ─── Main page ────────────────────────────────────────────────────────────────

function UpsellPage() {
  const [tab, setTab] = useState<Tab>("rules");
  const [editRule, setEditRule] = useState<UpsellRule | null>(null);

  function openNew() { setEditRule(null); setTab("new"); }
  function openEdit(r: UpsellRule) { setEditRule(r); setTab("new"); }

  return (
    <>
      <PageHeader
        title="Post-Order Upsell Engine"
        subtitle="Order confirm hone ke baad related products suggest karein — average order value increase."
        actions={<Btn variant="primary" onClick={openNew}><Plus className="h-4 w-4" /> New Rule</Btn>}
      />

      {/* Stats */}
      <StatsRow />

      {/* Tab bar */}
      <div className="flex gap-1 my-5 bg-secondary rounded-lg p-1 w-fit">
        {(["rules", "logs", "new"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { if (t !== "new") setTab(t); else openNew(); }}
            className={cn(
              "h-8 px-3 rounded-md text-sm font-medium transition-colors",
              tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "rules" ? "Rules" : t === "logs" ? "Activity Log" : editRule ? "Edit Rule" : "New Rule"}
          </button>
        ))}
      </div>

      {tab === "rules" && <RulesTab onEdit={openEdit} />}
      {tab === "logs"  && <LogsTab />}
      {tab === "new"   && <RuleForm existing={editRule} onSaved={() => setTab("rules")} />}
    </>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow() {
  const { data: stats, isLoading } = useQuery<UpsellStats>({
    queryKey: ["upsell-stats"],
    queryFn: async () => {
      try {
        const { getUpsellStats } = await import("@/lib/upsell.functions");
        return await useServerFn(getUpsellStats)() as UpsellStats;
      } catch { return MOCK_STATS; }
    },
    staleTime: 60_000,
    placeholderData: MOCK_STATS,
  });

  const s = stats ?? MOCK_STATS;
  const cards = [
    { label: "Upsell Attempts",    value: s.totalAttempts,                  icon: Zap,             color: "text-primary" },
    { label: "Conversions",        value: s.conversions,                    icon: ShoppingCart,     color: "text-success" },
    { label: "Conversion Rate",    value: `${s.conversionRate}%`,           icon: Percent,         color: "text-warning" },
    { label: "Revenue Generated",  value: `PKR ${s.revenueGenerated.toLocaleString()}`, icon: BadgeDollarSign, color: "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
      {cards.map((c) => (
        <Card key={c.label}>
          {isLoading ? (
            <><Skeleton className="h-3 w-28 mb-2" /><Skeleton className="h-7 w-16" /></>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <c.icon className={cn("h-3.5 w-3.5", c.color)} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <div className="text-xl font-bold">{c.value}</div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Rules tab ────────────────────────────────────────────────────────────────

function RulesTab({ onEdit }: { onEdit: (r: UpsellRule) => void }) {
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery<UpsellRule[]>({
    queryKey: ["upsell-rules"],
    queryFn: async () => {
      try {
        const { getUpsellRules } = await import("@/lib/upsell.functions");
        const d = await useServerFn(getUpsellRules)() as UpsellRule[];
        return d.length ? d : MOCK_RULES;
      } catch { return MOCK_RULES; }
    },
    staleTime: 60_000,
    placeholderData: MOCK_RULES,
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { toggleUpsellRule } = await import("@/lib/upsell.functions");
      return useServerFn(toggleUpsellRule)({ data: { id, active } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["upsell-rules"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Toggle failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { deleteUpsellRule } = await import("@/lib/upsell.functions");
      return useServerFn(deleteUpsellRule)({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ["upsell-rules"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Card key={i}><Skeleton className="h-20 w-full rounded-lg" /></Card>)}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <Card className="text-center py-12 text-muted-foreground">
        <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No upsell rules yet. Create your first rule!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((r) => (
        <Card key={r.id} className={cn("transition-opacity", !r.isActive && "opacity-60")}>
          <div className="flex items-start gap-4">
            <Toggle
              checked={r.isActive}
              onChange={(v) => toggleMut.mutate({ id: r.id, active: v })}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{r.name}</span>
                <Badge variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Active" : "Paused"}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <span className="bg-secondary px-2 py-0.5 rounded text-xs">{r.triggerProduct}</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{r.suggestProduct}</span>
                <span className="text-xs">PKR {r.suggestPrice.toLocaleString()}</span>
                <span className="text-xs">·</span>
                <span className="text-xs">{DELAY_OPTIONS.find((d) => d.value === r.delayMinutes)?.label ?? `${r.delayMinutes}m`} after order</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{r.messageTemplate}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Btn variant="outline" className="text-xs h-7 px-2" onClick={() => onEdit(r)}>Edit</Btn>
              <Btn
                variant="ghost"
                className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                onClick={() => deleteMut.mutate(r.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Logs tab ─────────────────────────────────────────────────────────────────

function LogsTab() {
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery<UpsellLog[]>({
    queryKey: ["upsell-logs"],
    queryFn: async () => {
      try {
        const { getUpsellLogs } = await import("@/lib/upsell.functions");
        const d = await useServerFn(getUpsellLogs)() as UpsellLog[];
        return d.length ? d : MOCK_LOGS;
      } catch { return MOCK_LOGS; }
    },
    staleTime: 30_000,
    placeholderData: MOCK_LOGS,
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Upsell Activity</h2>
        <Btn variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["upsell-logs"] })}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Btn>
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Rule</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-2.5 font-medium">{l.customerName ?? l.customerId}</td>
                  <td className="py-2.5 text-muted-foreground text-xs">{l.ruleName}</td>
                  <td className="py-2.5"><UpsellLogBadge status={l.status} /></td>
                  <td className="py-2.5 text-right font-medium text-success">
                    {(l.revenue ?? 0) > 0 ? `PKR ${(l.revenue ?? 0).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-2.5 text-right text-xs text-muted-foreground">
                    {l.sentAt ? timeAgo(l.sentAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Rule form ────────────────────────────────────────────────────────────────

const BLANK_RULE: Omit<UpsellRule, "id" | "createdAt"> = {
  name: "",
  triggerProduct: PRODUCT_OPTIONS[0],
  suggestProduct: PRODUCT_OPTIONS[1],
  suggestPrice: 0,
  delayMinutes: 5,
  messageTemplate: "Salam {{name}}! {{trigger_product}} ke baad, {{suggest_product}} bhi try karein — PKR {{price}}. Reply karein!",
  isActive: true,
};

function RuleForm({ existing, onSaved }: { existing: UpsellRule | null; onSaved: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Omit<UpsellRule, "id" | "createdAt">>(existing ?? BLANK_RULE);

  useEffect(() => { setForm(existing ?? BLANK_RULE); }, [existing]);

  const set = <K extends keyof typeof form>(key: K) => (val: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const saveMut = useMutation({
    mutationFn: async () => {
      const { saveUpsellRule } = await import("@/lib/upsell.functions");
      return useServerFn(saveUpsellRule)({
        data: existing ? { ...form, id: existing.id } : form,
      });
    },
    onSuccess: () => {
      toast.success(existing ? "Rule updated" : "Rule created");
      qc.invalidateQueries({ queryKey: ["upsell-rules"] });
      onSaved();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const TOKENS_RULE = ["{{name}}", "{{trigger_product}}", "{{suggest_product}}", "{{price}}"];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card>
          <h2 className="font-semibold mb-3">{existing ? "Edit Rule" : "New Upsell Rule"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Rule Name</label>
              <input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="e.g. ChatGPT → Claude Upsell"
                className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Trigger Product (customer buys)</label>
                <select
                  value={form.triggerProduct}
                  onChange={(e) => set("triggerProduct")(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
                >
                  {PRODUCT_OPTIONS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Suggest Product</label>
                <select
                  value={form.suggestProduct}
                  onChange={(e) => set("suggestProduct")(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
                >
                  {PRODUCT_OPTIONS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Suggest Price (PKR)</label>
                <input
                  type="number"
                  value={form.suggestPrice}
                  onChange={(e) => set("suggestPrice")(+e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Send After</label>
                <select
                  value={form.delayMinutes}
                  onChange={(e) => set("delayMinutes")(+e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
                >
                  {DELAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-2">Message Template</h2>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TOKENS_RULE.map((tok) => (
              <code
                key={tok}
                className="text-xs bg-secondary px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10 hover:text-primary"
                onClick={() => set("messageTemplate")(form.messageTemplate + tok)}
              >
                {tok}
              </code>
            ))}
          </div>
          <textarea
            rows={5}
            value={form.messageTemplate}
            onChange={(e) => set("messageTemplate")(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm resize-none"
          />
        </Card>

        <Btn
          variant="primary"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !form.name.trim()}
        >
          {saveMut.isPending
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Save className="h-4 w-4" /> {existing ? "Update Rule" : "Create Rule"}</>}
        </Btn>
      </div>

      {/* Live preview */}
      <Card>
        <h2 className="font-semibold mb-3">Rule Preview</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            <span>Customer buys <strong>{form.triggerProduct}</strong></span>
          </div>
          <div className="flex justify-center text-muted-foreground text-xs">
            ↓ after {DELAY_OPTIONS.find((d) => d.value === form.delayMinutes)?.label}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <span>Bot sends upsell for <strong>{form.suggestProduct}</strong></span>
          </div>
        </div>

        <div className="mt-4 bg-[#ECE5DD] rounded-xl p-3">
          <div className="bg-white rounded-xl rounded-tl-none p-3 text-sm max-w-[90%] shadow-sm whitespace-pre-wrap">
            {form.messageTemplate
              .replace(/{{name}}/g, "Ali")
              .replace(/{{trigger_product}}/g, form.triggerProduct)
              .replace(/{{suggest_product}}/g, form.suggestProduct)
              .replace(/{{price}}/g, form.suggestPrice.toLocaleString())}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UpsellLogBadge({ status }: { status: UpsellLog["status"] }) {
  const map = {
    sent:      { label: "Sent",      variant: "info"    as const },
    converted: { label: "Converted", variant: "success" as const },
    ignored:   { label: "Ignored",   variant: "muted"   as const },
  };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
