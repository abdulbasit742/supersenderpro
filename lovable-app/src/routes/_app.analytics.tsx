import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, KpiCard, Skeleton } from "@/components/ui-kit";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { BarChart3, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useFinancialsAnalytics, useProfitSeries } from "@/lib/hooks";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

const COLORS = [
  "var(--color-primary)", "var(--color-info)", "var(--color-warning)",
  "var(--color-success)", "var(--color-destructive)",
];

function AnalyticsPage() {
  const { data: financials, isLoading: finLoading } = useFinancialsAnalytics();
  const { data: profit,     isLoading: profitLoading } = useProfitSeries(30);

  const isLoading = finLoading || profitLoading;

  const pieData = profit?.topTools?.map((t) => ({ name: t.tool, value: t.profit })) ?? [];

  const kpis = [
    { label: "Total Revenue",   value: `Rs ${(financials?.totalRevenue  ?? 0).toLocaleString()}`,        icon: BarChart3,    accent: "success"  as const },
    { label: "Total Profit",    value: `Rs ${(financials?.totalProfit   ?? 0).toLocaleString()}`,        icon: CheckCircle2, accent: "success"  as const },
    { label: "Avg Order Value", value: `Rs ${(financials?.avgOrderValue ?? 0).toLocaleString()}`,        icon: Calendar,     accent: "info"     as const },
    { label: "Refund Rate",     value: `${(financials?.refundRate       ?? 0).toFixed(1)}%`,             icon: XCircle,      accent: "warning"  as const },
    { label: "Orders (30d)",    value: profit?.daily?.reduce((s, d) => s + d.orders, 0) ?? 0,           icon: Clock,        accent: "primary"  as const },
    { label: "Avg Margin",      value: `${(profit?.avgMargin            ?? 0).toFixed(1)}%`,             icon: BarChart3,    accent: "info"     as const },
  ];

  return (
    <>
      <PageHeader title="Analytics" subtitle="Revenue, profit aur performance breakdown." />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-elevated rounded-xl p-4 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-24" /></div>
              </div>
            ))
          : kpis.map((k) => (
              <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} accent={k.accent} />
            ))
        }
      </div>

      {/* ── Revenue + Profit trend ── */}
      <Section title="30-Day Revenue & Profit Trend" actions={<span className="text-xs text-muted-foreground">Last 30 days</span>}>
        {profitLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={profit?.daily ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-info)"    strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="profit"  stroke="var(--color-success)" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* ── Top tools bar chart ── */}
        <Section title="Top Tools by Sales Volume">
          {profitLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={profit?.topTools ?? []}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="tool" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="quantity" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        {/* ── Profit share pie ── */}
        <Section title="Profit Share by Tool">
          {profitLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => [`Rs ${v.toLocaleString()}`, "Profit"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>

      {/* ── Monthly trend ── */}
      {financials?.monthlyTrend && financials.monthlyTrend.length > 0 && (
        <Section title="Monthly Revenue Trend" actions={<span className="text-xs text-muted-foreground mt-4">Full history</span>}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={financials.monthlyTrend}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="var(--color-info)"    radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="profit"  fill="var(--color-success)" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
    </>
  );
}
