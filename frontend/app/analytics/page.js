'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import KpiCard from '../../components/KpiCard';
import StatusBadge from '../../components/StatusBadge';
import { safeApi } from '../../lib/api';
import { profit as demoProfit, insights as demoInsights } from '../../lib/demoData';

const colors = ['#15c59b', '#38bdf8', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [profit, setProfit] = useState(demoProfit);
  const [insights, setInsights] = useState(demoInsights);

  useEffect(() => {
    Promise.all([
      safeApi('/api/analytics/profit?days=30', demoProfit),
      safeApi('/api/analytics/insights?days=30', demoInsights)
    ]).then(([profitData, insightsData]) => {
      setProfit(profitData);
      setInsights({
        ...demoInsights,
        ...insightsData,
        whyBuy: insightsData.whyBuy?.length ? insightsData.whyBuy : demoInsights.whyBuy,
        whyNotBuy: insightsData.whyNotBuy?.length ? insightsData.whyNotBuy : demoInsights.whyNotBuy,
        hourly: insightsData.hourly?.length ? insightsData.hourly : demoInsights.hourly,
        topToolsDonut: insightsData.topToolsDonut?.length ? insightsData.topToolsDonut : demoInsights.topToolsDonut,
        suggestions: insightsData.suggestions?.length ? insightsData.suggestions : demoInsights.suggestions,
        agentPerformance: insightsData.agentPerformance || demoInsights.agentPerformance
      });
    });
  }, []);

  const marginTrend = (profit.daily || []).map((row) => ({
    ...row,
    margin: row.revenue ? Number(((row.profit / row.revenue) * 100).toFixed(1)) : 0
  }));

  return (
    <AppShell title="Analytics / Business Intelligence">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="30d Revenue" value={`Rs ${Number(profit.totalRevenue || 0).toLocaleString()}`} tone="good" />
        <KpiCard label="30d Profit" value={`Rs ${Number(profit.totalProfit || 0).toLocaleString()}`} tone="good" />
        <KpiCard label="Conversion" value={`${Number((insights.conversionRate || 0) * 100).toFixed(1)}%`} />
        <KpiCard label="Retention" value={`${Number((insights.retentionRate || 0) * 100).toFixed(1)}%`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Why People Buy">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.whyBuy}>
                <CartesianGrid stroke="#94a3b822" />
                <XAxis dataKey="reason" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="count" fill="#15c59b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone="good">Price 82%</StatusBadge>
            <StatusBadge tone="good">Fast delivery 71%</StatusBadge>
            <StatusBadge tone="good">Trust 65%</StatusBadge>
          </div>
        </Panel>

        <Panel title="Why People Do Not Buy">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.whyNotBuy}>
                <CartesianGrid stroke="#94a3b822" />
                <XAxis dataKey="reason" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone="bad">Price too high 74%</StatusBadge>
            <StatusBadge tone="bad">No trust 61%</StatusBadge>
            <StatusBadge tone="bad">Slow reply 49%</StatusBadge>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Panel title="Best Time of Day Heatmap">
          <div className="grid grid-cols-4 gap-2 md:grid-cols-6 xl:grid-cols-8">
            {insights.hourly.map((slot) => (
              <div
                key={slot.hour}
                className="rounded-xl border border-line p-3 text-center"
                style={{ backgroundColor: `rgba(21,197,155,${0.08 + Number(slot.intensity || 0) * 0.6})` }}
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">{slot.hour}:00</div>
                <div className="font-bold">{slot.orders}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top Selling Tools">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={insights.topToolsDonut} dataKey="value" nameKey="name" innerRadius={62} outerRadius={105}>
                  {insights.topToolsDonut.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Profit Margin Trend / 30 Days">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marginTrend}>
                <CartesianGrid stroke="#94a3b822" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="margin" stroke="#15c59b" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="AI Techniques Suggestions">
          <div className="grid gap-3">
            <div className="rounded-xl border border-line bg-card p-4 text-sm">Price anchoring se 40% zyada conversion: pehle warranty value show karein, phir limited private offer.</div>
            <div className="rounded-xl border border-line bg-card p-4 text-sm">Urgency messaging se 35% faster decisions: sirf real low stock par slots remaining show karein.</div>
            <div className="rounded-xl border border-line bg-card p-4 text-sm">Bundle deals se average order value barhayein: ChatGPT + Cursor ya Claude + Midjourney bundle push karein.</div>
            {(insights.suggestions || []).map((item, index) => (
              <div key={index} className="rounded-xl border border-line bg-card p-4 text-sm">{item}</div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Dealer / Agent Performance Comparison">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Agent</th>
                  <th className="table-th">Reply sec</th>
                  <th className="table-th">Resolved</th>
                  <th className="table-th">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(insights.agentPerformance || []).map((row) => (
                  <tr key={row.name}>
                    <td className="table-td font-bold">{row.name}</td>
                    <td className="table-td">{row.responseTime}s</td>
                    <td className="table-td text-emerald-600 dark:text-emerald-300">{row.resolved}%</td>
                    <td className="table-td">Rs {Number(row.revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
