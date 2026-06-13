'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import KpiCard from '../../components/KpiCard';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api, safeApi } from '../../lib/api';

const fallback = {
  daily: {
    orders: 0,
    delivered: 0,
    revenue: 0,
    profit: 0,
    topTool: '-',
    lowStock: [],
    expiringTomorrow: 0
  },
  dynamicAvailability: [],
  tasks: []
};

const jobs = [
  ['expiry_reminders', 'Send renewal reminders'],
  ['pending_payment_recovery', 'Recover pending payments'],
  ['smart_upsell', 'Run smart upsells'],
  ['lost_customer_recovery', 'Recover inactive customers'],
  ['review_request', 'Ask for reviews'],
  ['stock_and_pricing_refresh', 'Refresh stock/pricing'],
  ['segmented_evening_deals', 'Send segmented deals'],
  ['daily_zero_touch_summary', 'Send admin summary']
];

export default function ZeroTouchPage() {
  const [summary, setSummary] = useState(fallback);
  const [recommendations, setRecommendations] = useState([]);
  const [running, setRunning] = useState('');
  const [lastResult, setLastResult] = useState('');

  async function load() {
    const [data, recs] = await Promise.all([
      safeApi('/api/zero-touch/summary', fallback),
      safeApi('/api/zero-touch/pricing-recommendations', [])
    ]);
    setSummary(data);
    setRecommendations(recs);
  }

  async function runJob(job) {
    setRunning(job);
    try {
      const result = await api(`/api/zero-touch/run/${job}`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setLastResult(`${job}: ${JSON.stringify(result.result || result).slice(0, 500)}`);
      await load();
    } catch (error) {
      setLastResult(`${job} failed: ${error.message}`);
    } finally {
      setRunning('');
    }
  }

  useEffect(() => { load(); }, []);

  const tasks = useMemo(() => {
    return Array.isArray(summary.tasks)
      ? summary.tasks.map((row) => ({ status: row.status, count: row._count?.status || row.count || 0 }))
      : [];
  }, [summary.tasks]);

  return (
    <AppShell title="Zero-Touch Order Engine">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today Revenue" value={`Rs ${Number(summary.daily?.revenue || 0).toLocaleString()}`} tone="good" />
        <KpiCard label="Today Profit" value={`Rs ${Number(summary.daily?.profit || 0).toLocaleString()}`} tone="good" />
        <KpiCard label="Orders / Delivered" value={`${summary.daily?.orders || 0}/${summary.daily?.delivered || 0}`} />
        <KpiCard label="Expiring Tomorrow" value={summary.daily?.expiringTomorrow || 0} tone={summary.daily?.expiringTomorrow ? 'warn' : 'normal'} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Autopilot Jobs">
          <div className="grid gap-3 sm:grid-cols-2">
            {jobs.map(([job, label]) => (
              <button
                key={job}
                onClick={() => runJob(job)}
                disabled={Boolean(running)}
                className="rounded-xl border border-line bg-card px-4 py-3 text-left text-sm font-semibold hover:border-mint disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div>{label}</div>
                <div className="mt-1 text-xs text-slate-500">{job}</div>
              </button>
            ))}
          </div>
          {lastResult ? <pre className="mt-4 overflow-auto rounded-xl bg-black/20 p-3 text-xs">{lastResult}</pre> : null}
        </Panel>

        <Panel title="Task Queue Status">
          <div className="space-y-3">
            {tasks.length ? tasks.map((task) => (
              <div key={task.status} className="flex items-center justify-between rounded-xl border border-line bg-card p-3">
                <StatusBadge tone={task.status === 'failed' ? 'bad' : task.status === 'done' ? 'good' : 'info'}>{task.status}</StatusBadge>
                <div className="text-xl font-black">{task.count}</div>
              </div>
            )) : <div className="text-sm text-slate-500">No automation task records yet.</div>}
            <div className="rounded-xl border border-line bg-card p-3 text-sm">
              <div className="font-bold">Tonight Admin Report</div>
              <div className="mt-1 text-slate-500">9 PM: sales, revenue, stock, expiring accounts, and tomorrow suggestions.</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Panel title="Dynamic Availability Preview">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Tool</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Price</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th">Rules</th>
                </tr>
              </thead>
              <tbody>
                {(summary.dynamicAvailability || []).slice(0, 18).map((row) => (
                  <tr key={`${row.toolSlug}-${row.planSlug}-${row.accountType}`}>
                    <td className="table-td font-semibold">{row.toolName || row.tool} {row.planName || row.plan}</td>
                    <td className="table-td"><StatusBadge tone={row.inStock ? 'good' : 'bad'}>{row.accountLabel || row.accountType}</StatusBadge></td>
                    <td className="table-td">Rs {Number(row.price || 0).toLocaleString()}</td>
                    <td className="table-td">{row.stockQty || row.slots || 0}</td>
                    <td className="table-td text-xs text-slate-500">{(row.reasons || []).join(', ') || 'base'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Best Pricing Suggestions">
          <div className="space-y-3">
            {recommendations.slice(0, 10).map((row) => (
              <div key={`${row.toolSlug}-${row.planSlug}-${row.accountType}`} className="rounded-xl border border-line bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold">{row.toolName} {row.planName}</div>
                  <StatusBadge tone="good">{Number(row.marginPct || 0).toFixed(1)}%</StatusBadge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div>Buy<br /><span className="font-bold text-slate-800 dark:text-slate-200">Rs {Number(row.buyPrice || 0).toLocaleString()}</span></div>
                  <div>Sell<br /><span className="font-bold text-slate-800 dark:text-slate-200">Rs {Number(row.sellPrice || 0).toLocaleString()}</span></div>
                  <div>Profit<br /><span className="font-bold text-emerald-500">Rs {Number(row.profit || 0).toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
