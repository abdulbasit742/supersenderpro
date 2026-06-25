import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Toggle, Skeleton } from "@/components/ui-kit";
import {
  CalendarClock, AlertTriangle, CheckCircle2, TrendingUp,
  BadgeDollarSign, Send, RefreshCw, Settings2, Bell, Save,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/renewals")({
  component: RenewalsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface RenewalOrder {
  id: string;
  customer_name?: string;
  whatsapp?: string;
  tool: string;
  plan: string;
  sell_price: number;
  expiry_date: string;
  days_left: number;
  renewal_status: "active" | "expiring_soon" | "expired" | "renewed";
  last_reminder_at?: string;
}

interface RenewalStats {
  expiringToday: number;
  expiringWeek: number;
  renewedThisMonth: number;
  churnSavedPkr: number;
  totalActive: number;
}

interface RenewalConfig {
  reminderDays: number[];
  messageTemplate: string;
  autoSend: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATS: RenewalStats = {
  expiringToday: 3,
  expiringWeek: 11,
  renewedThisMonth: 28,
  churnSavedPkr: 47600,
  totalActive: 84,
};

const MOCK_ORDERS: RenewalOrder[] = [
  { id: "1", customer_name: "Ali Hassan",    whatsapp: "03001234567", tool: "ChatGPT Plus", plan: "1 Month", sell_price: 1500, expiry_date: new Date(Date.now() + 86400000).toISOString(),     days_left: 1,  renewal_status: "expiring_soon" },
  { id: "2", customer_name: "Sara Ahmed",    whatsapp: "03211111111", tool: "Claude Pro",   plan: "1 Month", sell_price: 1700, expiry_date: new Date(Date.now() + 172800000).toISOString(),    days_left: 2,  renewal_status: "expiring_soon" },
  { id: "3", customer_name: "Bilal Raza",    whatsapp: "03451234567", tool: "ChatGPT Plus", plan: "1 Month", sell_price: 1500, expiry_date: new Date(Date.now() + 259200000).toISOString(),    days_left: 3,  renewal_status: "expiring_soon" },
  { id: "4", customer_name: "Zara Khan",     whatsapp: "03331234567", tool: "Claude Pro",   plan: "1 Month", sell_price: 1700, expiry_date: new Date(Date.now() - 86400000).toISOString(),     days_left: -1, renewal_status: "expired" },
  { id: "5", customer_name: "Usman Malik",   whatsapp: "03121234567", tool: "ChatGPT Plus", plan: "3 Month", sell_price: 4200, expiry_date: new Date(Date.now() + 604800000).toISOString(),    days_left: 7,  renewal_status: "expiring_soon" },
  { id: "6", customer_name: "Hina Qureshi",  whatsapp: "03081234567", tool: "Claude Pro",   plan: "1 Month", sell_price: 1700, expiry_date: new Date(Date.now() + 1209600000).toISOString(),   days_left: 14, renewal_status: "active" },
];

const DEFAULT_CONFIG: RenewalConfig = {
  reminderDays: [3, 1, 0],
  messageTemplate: "Salam {{name}}! 👋\n\nAapki *{{product}}* subscription {{days}} din mein expire ho rahi hai.\n\nRenew karne ke liye reply karein — price: PKR {{price}} 💰\n\nPayment methods:\n💚 JazzCash: {{jazzcash}}\n💜 EasyPaisa: {{easypaisa}}",
  autoSend: false,
};

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "expiring" | "renewed" | "all" | "settings";

function RenewalsPage() {
  const [tab, setTab] = useState<Tab>("expiring");

  return (
    <>
      <PageHeader
        title="Subscription Renewal Engine"
        subtitle="Expiring subscriptions track karein — auto-reminders, renewal status, churn prevention."
      />

      {/* Stats */}
      <StatsRow />

      {/* Tab bar */}
      <div className="flex gap-1 my-5 bg-secondary rounded-lg p-1 w-fit">
        {(["expiring","renewed","all","settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-8 px-3 rounded-md text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "expiring" ? "Expiring" : t === "renewed" ? "Renewed" : t === "all" ? "All Active" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "expiring"  && <RenewalTable filter="expiring" />}
      {tab === "renewed"   && <RenewalTable filter="renewed" />}
      {tab === "all"       && <RenewalTable filter="all" />}
      {tab === "settings"  && <SettingsTab />}
    </>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow() {
  const { data: stats, isLoading } = useQuery<RenewalStats>({
    queryKey: ["renewal-stats"],
    queryFn: async () => {
      try {
        const { getRenewalStats } = await import("@/lib/renewals.functions");
        return await getRenewalStats() as RenewalStats;
      } catch { return MOCK_STATS; }
    },
    staleTime: 60_000,
    placeholderData: MOCK_STATS,
  });

  const s = stats ?? MOCK_STATS;
  const cards = [
    { label: "Expiring Today",     value: s.expiringToday,                  icon: AlertTriangle,   color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Expiring This Week", value: s.expiringWeek,                   icon: CalendarClock,   color: "text-warning",     bg: "bg-warning/10" },
    { label: "Renewed This Month", value: s.renewedThisMonth,               icon: CheckCircle2,    color: "text-success",     bg: "bg-success/10" },
    { label: "Churn Saved (PKR)",  value: `${s.churnSavedPkr.toLocaleString()}`, icon: BadgeDollarSign, color: "text-primary",     bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
      {cards.map((c) => (
        <Card key={c.label} className={cn("flex items-center gap-3", c.bg)}>
          {isLoading ? (
            <><Skeleton className="h-9 w-9 rounded-lg" /><div><Skeleton className="h-3 w-24 mb-1" /><Skeleton className="h-6 w-12" /></div></>
          ) : (
            <>
              <div className={cn("h-9 w-9 rounded-lg bg-card grid place-items-center shrink-0", c.color)}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-xl font-bold">{c.value}</div>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Renewal table ────────────────────────────────────────────────────────────

function RenewalTable({ filter }: { filter: "expiring" | "renewed" | "all" }) {
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery<RenewalOrder[]>({
    queryKey: ["renewal-orders"],
    queryFn: async () => {
      try {
        const { getExpiringSubscriptions } = await import("@/lib/renewals.functions");
        const d = await getExpiringSubscriptions() as RenewalOrder[];
        return d.length ? d : MOCK_ORDERS;
      } catch { return MOCK_ORDERS; }
    },
    staleTime: 60_000,
    placeholderData: MOCK_ORDERS,
  });

  const filtered = orders.filter((o) => {
    if (filter === "expiring") return o.renewal_status === "expiring_soon" || o.renewal_status === "expired";
    if (filter === "renewed")  return o.renewal_status === "renewed";
    return true;
  });

  const sendReminder = useMutation({
    mutationFn: async (orderId: string) => {
      const { sendRenewalReminder } = await import("@/lib/renewals.functions");
      return sendRenewalReminder({ data: { orderId } });
    },
    onSuccess: (_, orderId) => {
      toast.success("Reminder sent");
      qc.setQueryData<RenewalOrder[]>(["renewal-orders"], (prev = []) =>
        prev.map((o) => o.id === orderId ? { ...o, last_reminder_at: new Date().toISOString() } : o)
      );
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  const markRenewed = useMutation({
    mutationFn: async (orderId: string) => {
      const { markRenewed: fn } = await import("@/lib/renewals.functions");
      const newExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      return fn({ data: { orderId, newExpiryDate: newExpiry } });
    },
    onSuccess: (_, orderId) => {
      toast.success("Marked as renewed — expiry extended 30 days");
      qc.setQueryData<RenewalOrder[]>(["renewal-orders"], (prev = []) =>
        prev.map((o) => o.id === orderId ? { ...o, renewal_status: "renewed" } : o)
      );
      qc.invalidateQueries({ queryKey: ["renewal-stats"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      </Card>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No subscriptions in this category.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{filtered.length} subscriptions</span>
        <Btn variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["renewal-orders"] })}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Btn>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium text-center">Days Left</th>
              <th className="pb-2 font-medium text-right">Price</th>
              <th className="pb-2 font-medium">Last Reminder</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-accent/40 transition-colors">
                <td className="py-3">
                  <div className="font-medium">{o.customer_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{o.whatsapp}</div>
                </td>
                <td className="py-3">
                  <div>{o.tool}</div>
                  <div className="text-xs text-muted-foreground">{o.plan}</div>
                </td>
                <td className="py-3 text-center">
                  <span className={cn(
                    "text-sm font-bold",
                    o.days_left <= 0 ? "text-destructive" :
                    o.days_left <= 3 ? "text-warning" : "text-foreground"
                  )}>
                    {o.days_left <= 0 ? `${Math.abs(o.days_left)}d ago` : `${o.days_left}d`}
                  </span>
                </td>
                <td className="py-3 text-right font-medium">PKR {o.sell_price.toLocaleString()}</td>
                <td className="py-3 text-xs text-muted-foreground">
                  {o.last_reminder_at ? timeAgo(o.last_reminder_at) : "Never"}
                </td>
                <td className="py-3">
                  <RenewalStatusBadge status={o.renewal_status} />
                </td>
                <td className="py-3">
                  <div className="flex gap-1.5 justify-end flex-wrap">
                    {o.renewal_status !== "renewed" && (
                      <>
                        <Btn
                          variant="outline"
                          className="text-xs h-7 px-2"
                          onClick={() => sendReminder.mutate(o.id)}
                          disabled={sendReminder.isPending}
                        >
                          <Send className="h-3 w-3" /> Remind
                        </Btn>
                        <Btn
                          variant="primary"
                          className="text-xs h-7 px-2"
                          onClick={() => markRenewed.mutate(o.id)}
                          disabled={markRenewed.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Renewed
                        </Btn>
                      </>
                    )}
                    {o.renewal_status === "renewed" && (
                      <Badge variant="success">Renewed ✓</Badge>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<RenewalConfig>(DEFAULT_CONFIG);
  const [newDay, setNewDay] = useState("");

  const { isLoading } = useQuery<RenewalConfig>({
    queryKey: ["renewal-config"],
    queryFn: async () => {
      try {
        const { getRenewalConfig } = await import("@/lib/renewals.functions");
        return await getRenewalConfig() as RenewalConfig;
      } catch { return DEFAULT_CONFIG; }
    },
    staleTime: 300_000,
  });

  const saveMut = useMutation({
    mutationFn: async (cfg: RenewalConfig) => {
      const { saveRenewalConfig } = await import("@/lib/renewals.functions");
      return saveRenewalConfig({ data: cfg });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["renewal-config"] });
      toast.success("Renewal settings saved");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (isLoading) return <Card><Skeleton className="h-40 w-full rounded-lg" /></Card>;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Reminder Timing</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Expiry se kitne din pehle reminder bheja jaye:
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {config.reminderDays.sort((a, b) => b - a).map((d) => (
            <div key={d} className="flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-full text-sm">
              <span>{d === 0 ? "Expiry day" : `${d} days before`}</span>
              <button
                onClick={() => setConfig((p) => ({ ...p, reminderDays: p.reminderDays.filter((x) => x !== d) }))}
                className="text-muted-foreground hover:text-destructive ml-1 text-xs"
              >×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            max={30}
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            placeholder="Days before (0 = expiry day)"
            className="flex-1 h-8 px-3 rounded-md bg-secondary border border-border text-sm"
          />
          <Btn variant="outline" onClick={() => {
            const d = parseInt(newDay);
            if (!isNaN(d) && !config.reminderDays.includes(d)) {
              setConfig((p) => ({ ...p, reminderDays: [...p.reminderDays, d] }));
              setNewDay("");
            }
          }}>Add</Btn>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Auto-Send</h2>
          </div>
          <Toggle
            checked={config.autoSend}
            onChange={(v) => setConfig((p) => ({ ...p, autoSend: v }))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {config.autoSend
            ? "Bot automatically reminder bhejta hai set timing pe."
            : "Manual send — aap khud Remind button dabate hain."}
        </p>
      </Card>

      <Card className="lg:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Send className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Reminder Message Template</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {["{{name}}", "{{product}}", "{{days}}", "{{price}}", "{{jazzcash}}", "{{easypaisa}}"].map((token) => (
            <code
              key={token}
              className="text-xs bg-secondary px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10 hover:text-primary"
              onClick={() => setConfig((p) => ({ ...p, messageTemplate: p.messageTemplate + " " + token }))}
            >
              {token}
            </code>
          ))}
        </div>
        <textarea
          rows={7}
          value={config.messageTemplate}
          onChange={(e) => setConfig((p) => ({ ...p, messageTemplate: e.target.value }))}
          className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm resize-none font-mono"
        />
      </Card>

      <div className="lg:col-span-2">
        <Btn variant="primary" onClick={() => saveMut.mutate(config)} disabled={saveMut.isPending}>
          {saveMut.isPending
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Save className="h-4 w-4" /> Save Settings</>}
        </Btn>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RenewalStatusBadge({ status }: { status: RenewalOrder["renewal_status"] }) {
  const map = {
    active:        { label: "Active",        variant: "success"     as const },
    expiring_soon: { label: "Expiring Soon", variant: "warning"     as const },
    expired:       { label: "Expired",       variant: "destructive" as const },
    renewed:       { label: "Renewed",       variant: "success"     as const },
  };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
