import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Target, TrendingUp, Save, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import type { SalesTarget, TargetConfig } from "@/lib/sales-targets.functions";

export const Route = createFileRoute("/_app/sales-targets")({
  component: SalesTargetsPage,
});

type Period = "daily" | "weekly" | "monthly";

function makeT(period: Period, off: number): SalesTarget {
  const d = new Date(); d.setDate(d.getDate() - off);
  const rev = period === "daily" ? 15000 : period === "weekly" ? 90000 : 350000;
  const actual = Math.round(rev * (0.6 + Math.random() * 0.6));
  const pct = (actual / rev) * 100;
  return { id: `t_${period}_${off}`, period, targetDate: d.toISOString(), revenueTarget: rev, orderCountTarget: period === "daily" ? 5 : period === "weekly" ? 30 : 120, newCustomerTarget: period === "monthly" ? 25 : 0, revenueActual: actual, orderCountActual: Math.round(actual / 3500), newCustomerActual: period === "monthly" ? Math.round(8 + Math.random() * 20) : 0, status: pct >= 100 ? "achieved" : pct >= 80 ? "on_track" : pct >= 60 ? "at_risk" : "behind" };
}

const MOCK_DAILY = [0,1,2,3,4,5,6].map(i => makeT("daily", i));
const MOCK_WEEKLY = [0,7,14].map(i => makeT("weekly", i));
const MOCK_MONTHLY = [0,30].map(i => makeT("monthly", i));
const MOCK_CONFIG: TargetConfig = { dailyRevenue: 15000, weeklyRevenue: 90000, monthlyRevenue: 350000, dailyOrders: 5, weeklyOrders: 30, monthlyOrders: 120, newCustomersMonthly: 25, alertBelowPercent: 70 };

const STATUS_ICONS = { achieved: <CheckCircle className="h-4 w-4 text-green-500" />, on_track: <TrendingUp className="h-4 w-4 text-blue-500" />, at_risk: <AlertCircle className="h-4 w-4 text-yellow-500" />, behind: <XCircle className="h-4 w-4 text-red-500" /> };
const STATUS_COLORS = { achieved: "bg-green-100 text-green-700", on_track: "bg-blue-100 text-blue-700", at_risk: "bg-yellow-100 text-yellow-700", behind: "bg-red-100 text-red-700" };

function TargetBar({ actual, target, label }: { actual: number; target: number; label: string }) {
  const pct = Math.min(100, Math.round((actual / target) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{pct}%</span></div>
      <div className="h-2 bg-muted rounded-full"><div className={`h-2 rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-blue-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function SalesTargetsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<TargetConfig>(MOCK_CONFIG);
  const qc = useQueryClient();

  const targets = period === "daily" ? MOCK_DAILY : period === "weekly" ? MOCK_WEEKLY : MOCK_MONTHLY;
  const currentTarget = targets[0];
  const pct = currentTarget ? Math.round((currentTarget.revenueActual / currentTarget.revenueTarget) * 100) : 0;

  const saveConfigMut = useMutation({
    mutationFn: async () => { const { saveTargetConfig } = await import("@/lib/sales-targets.functions"); return saveTargetConfig({ data: config as unknown as Record<string, unknown> }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["target-config"] }); setShowSettings(false); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" /> Sales Target Tracker</h1>
          <p className="text-muted-foreground text-sm">Daily, weekly, and monthly targets vs actual performance</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 border rounded-lg text-sm hover:bg-accent">Set Targets</button>
      </div>

      {currentTarget && (
        <div className="bg-card border-2 border-primary/30 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current {period.charAt(0).toUpperCase() + period.slice(1)} Target</div>
              <div className="text-3xl font-bold">PKR {(currentTarget.revenueActual / 1000).toFixed(1)}K <span className="text-lg text-muted-foreground font-normal">/ {(currentTarget.revenueTarget / 1000).toFixed(0)}K</span></div>
            </div>
            <div className="text-center">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[currentTarget.status]}`}>{STATUS_ICONS[currentTarget.status]}{currentTarget.status.replace("_"," ")}</div>
              <div className="text-3xl font-bold mt-1">{pct}%</div>
            </div>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden mb-4"><div className={`h-4 rounded-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-blue-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-400"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-lg font-bold">{currentTarget.orderCountActual}</div><div className="text-xs text-muted-foreground">Orders / {currentTarget.orderCountTarget} target</div></div>
            <div><div className="text-lg font-bold text-green-600">PKR {((currentTarget.revenueTarget - currentTarget.revenueActual) / 1000).toFixed(1)}K</div><div className="text-xs text-muted-foreground">Remaining to target</div></div>
            {period === "monthly" && <div><div className="text-lg font-bold">{currentTarget.newCustomerActual}</div><div className="text-xs text-muted-foreground">New customers / {currentTarget.newCustomerTarget}</div></div>}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["daily","weekly","monthly"] as Period[]).map(p => <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${period === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{p}</button>)}
      </div>

      <div className="space-y-3">
        {targets.map((t, i) => (
          <div key={t.id} className={`bg-card border rounded-xl p-4 ${i === 0 ? "border-primary/30" : ""}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                {STATUS_ICONS[t.status]}
                <span className="font-medium">{i === 0 ? `This ${period}` : new Date(t.targetDate).toLocaleDateString("en-PK", { weekday: period === "daily" ? "short" : undefined, month: "short", day: "numeric" })}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status.replace("_"," ")}</span>
              </div>
              <span className="font-bold">PKR {(t.revenueActual/1000).toFixed(1)}K / {(t.revenueTarget/1000).toFixed(0)}K</span>
            </div>
            <TargetBar actual={t.revenueActual} target={t.revenueTarget} label="Revenue" />
            <div className="mt-2"><TargetBar actual={t.orderCountActual} target={t.orderCountTarget} label="Orders" /></div>
          </div>
        ))}
      </div>

      {showSettings && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 max-w-md space-y-3">
          <h3 className="font-semibold">Set Targets</h3>
          {[["Daily Revenue","dailyRevenue"],["Weekly Revenue","weeklyRevenue"],["Monthly Revenue","monthlyRevenue"],["Daily Orders","dailyOrders"],["Weekly Orders","weeklyOrders"],["Monthly Orders","monthlyOrders"],["New Customers/Month","newCustomersMonthly"]].map(([label, key]) => (
            <div key={key} className="flex items-center gap-3"><label className="text-sm w-44 shrink-0">{label}</label><input type="number" value={(config as Record<string, number>)[key]} onChange={e => setConfig(p => ({ ...p, [key]: Number(e.target.value) }))} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />Save</button>
            <button onClick={() => setShowSettings(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
