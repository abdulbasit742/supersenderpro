import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, KpiCard } from "@/components/ui-kit";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getAnalytics } from "@/lib/analytics.functions";
import { BarChart3, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

const COLORS = ["var(--primary)", "var(--info)", "var(--warning)", "var(--success)", "var(--destructive)"];

function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const fn = useServerFn(getAnalytics);

  useEffect(() => {
    fn().then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Real-time social publishing performance." />
        <div className="animate-pulse space-y-4">
          <div className="grid lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted" />)}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="h-72 rounded-xl bg-muted" />
            <div className="h-72 rounded-xl bg-muted" />
          </div>
        </div>
      </>
    );
  }

  const { totalPosts, publishedPosts, scheduledPosts, draftPosts, failedPosts,
    platformBreakdown, dailyPosts, channelActivity, targetStatus } = data;

  const successRate = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Real-time social publishing performance." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Total Posts" value={totalPosts} icon={BarChart3} accent="primary" />
        <KpiCard label="Published" value={publishedPosts} hint={`${successRate}% success rate`} icon={CheckCircle2} accent="success" />
        <KpiCard label="Scheduled" value={scheduledPosts} icon={Clock} accent="info" />
        <KpiCard label="Failed" value={failedPosts} icon={XCircle} accent="destructive" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Section title="Daily Posts (last 14 days)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={dailyPosts}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Channel Activity (fetched vs published)">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={channelActivity}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="fetched" stroke="var(--color-info)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="published" stroke="var(--color-success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Section title="Posts by Platform">
          <div className="h-60">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={platformBreakdown} dataKey="total" nameKey="name" innerRadius={45} outerRadius={80}>
                  {platformBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Target Status Breakdown">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={targetStatus}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="status" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--color-warning)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Platform Success / Failure">
          <div className="h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2">Platform</th><th className="py-2">Total</th><th className="py-2">OK</th><th className="py-2">Fail</th></tr>
              </thead>
              <tbody>
                {platformBreakdown.map((pl: any) => (
                  <tr key={pl.name} className="border-b border-border last:border-0">
                    <td className="py-2 capitalize">{pl.name}</td>
                    <td className="py-2">{pl.total}</td>
                    <td className="py-2 text-success">{pl.published}</td>
                    <td className="py-2 text-destructive">{pl.failed}</td>
                  </tr>
                ))}
                {platformBreakdown.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
  );
}
