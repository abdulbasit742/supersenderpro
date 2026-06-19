'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../../components/AppShell';
import KpiCard from '../../components/KpiCard';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { api, safeApi } from '../../lib/api';
import { overview as demoOverview, profit as demoProfit, orders as demoOrders, stockInventory as demoStock, pendingTrust as demoPendingTrust } from '../../lib/demoData';

export default function DashboardPage() {
  const [summary, setSummary] = useState(demoOverview);
  const [profit, setProfit] = useState(demoProfit);
  const [orders, setOrders] = useState(demoOrders);
  const [stock, setStock] = useState(demoStock);
  const [pendingTrust, setPendingTrust] = useState(demoPendingTrust);
  const [watchdog, setWatchdog] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  async function load() {
    const [overview, profitRows, orderRows, stockRows, pendingRows, watchdogRes] = await Promise.all([
      safeApi('/api/business/overview', demoOverview),
      safeApi('/api/analytics/profit?days=7', demoProfit),
      safeApi('/api/business/orders?limit=8', demoOrders),
      safeApi('/api/business/stock-inventory', demoStock),
      safeApi('/api/dealer-intelligence/pending', demoPendingTrust),
      safeApi('/api/wa/channels/watchdog', null)
    ]);
    setSummary(overview);
    setProfit(profitRows);
    setOrders(orderRows);
    setStock(stockRows);
    setPendingTrust(pendingRows);
    if (watchdogRes && watchdogRes.status) {
      setWatchdog(watchdogRes.status);
    }
  }

  async function checkWatchdog() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await api('/api/wa/channels/watchdog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' })
      });
      setCheckResult(res);
      if (res && res.status) {
        setWatchdog(res.status);
      }
    } catch (error) {
      setCheckResult({
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        action: 'error',
        reasons: ['Error executing health check: ' + error.message]
      });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { load(); }, []);

  const lowStock = useMemo(() => {
    return stock
      .filter((row) => Number(row.quantityAvailable ?? row.availableQty ?? 0) <= Number(row.lowStockThreshold || 3))
      .slice(0, 6);
  }, [stock]);

  return (
    <AppShell title="Dashboard / مرکزی ڈیش بورڈ">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today Revenue / آج ریونیو" value={`Rs ${Number(summary.todayRevenue || 0).toLocaleString()}`} tone="good" />
        <KpiCard label="Today Profit / آج منافع" value={`Rs ${Number(summary.todayProfit || 0).toLocaleString()}`} tone="good" />
        <KpiCard label="Orders / آرڈرز" value={summary.todayOrders || 0} hint={`${summary.pendingOrders || 0} pending`} />
        <KpiCard label="Active Dealers / ڈیلرز" value={summary.trustedDealers || summary.activeDealers || 0} hint={`${summary.pendingTrust || pendingTrust.length || 0} pending trust`} />
      </div>

      {/* Watchdog & Auto-Fix Panel */}
      <div className="mt-6">
        <Panel title="Watchdog & Auto-Fix / خودکار مانیٹرنگ اور اصلاح" action={
          <button 
            disabled={checking}
            onClick={checkWatchdog}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            {checking ? "Running Check..." : "Run Health Check + Autofix"}
          </button>
        }>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
              <span className="text-slate-400 text-xs uppercase font-bold">Watchdog Uptime & Status</span>
              <div className="my-2 flex items-center justify-between">
                <span className="text-2xl font-bold">{watchdog?.readyScore ?? 0}%</span>
                <StatusBadge tone={watchdog?.status === 'ok' ? 'good' : watchdog?.status === 'warning' ? 'warn' : 'bad'}>
                  {watchdog?.status?.toUpperCase() || 'UNKNOWN'}
                </StatusBadge>
              </div>
              <span className="text-xs text-slate-500">
                Ready score target: {watchdog?.minReadyScore ?? 65}%
              </span>
            </div>

            <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
              <span className="text-slate-400 text-xs uppercase font-bold">Active Configuration</span>
              <div className="my-2 flex flex-wrap gap-1.5">
                <StatusBadge tone={watchdog?.enabled ? 'good' : 'neutral'}>
                  {watchdog?.enabled ? 'Watchdog Active' : 'Watchdog Disabled'}
                </StatusBadge>
                <StatusBadge tone={watchdog?.autoFix ? 'good' : 'neutral'}>
                  {watchdog?.autoFix ? 'Auto-Fix Active' : 'Manual Fix'}
                </StatusBadge>
              </div>
              <span className="text-xs text-slate-500">
                Interval: {watchdog?.intervalMinutes ?? 10} mins
              </span>
            </div>

            <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
              <span className="text-slate-400 text-xs uppercase font-bold">Last Run Check</span>
              <div className="my-2">
                <span className="text-sm font-semibold block">{watchdog?.lastRunAt ? new Date(watchdog.lastRunAt).toLocaleString() : 'Never'}</span>
                <span className="text-xs text-slate-400">Next due: {watchdog?.dueAt ? new Date(watchdog.dueAt).toLocaleTimeString() : 'N/A'}</span>
              </div>
              <span className="text-xs text-slate-500">
                Status: {watchdog?.lastStatus || 'No records'}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
              <span className="text-slate-400 text-xs uppercase font-bold">Last Auto-Fix Action</span>
              <div className="my-2">
                <span className="text-sm font-semibold block">{watchdog?.lastAutoFixAt ? new Date(watchdog.lastAutoFixAt).toLocaleString() : 'None'}</span>
                {watchdog?.lastAutoFixStatus && (
                  <StatusBadge tone={watchdog.lastAutoFixStatus === 'ok' ? 'good' : 'warn'}>
                    {watchdog.lastAutoFixStatus.toUpperCase()}
                  </StatusBadge>
                )}
              </div>
              <span className="text-xs text-slate-500 flex justify-between">
                <span>Auto-Fix count: {watchdog?.lastAutoFixAt ? 1 : 0}</span>
                <span>Uptime check: Active</span>
              </span>
            </div>
          </div>

          {/* Blockers & Action list */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Blockers & Issues ({watchdog?.blockers?.length ?? 0})</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {watchdog?.blockers && watchdog.blockers.length > 0 ? (
                  watchdog.blockers.map((blocker, i) => (
                    <div key={i} className="text-xs border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 p-2.5 rounded-lg font-mono">
                      ⚠️ {blocker}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 p-2 border border-emerald-500/20 bg-emerald-500/5 rounded-lg">
                    ✅ No blocking issues detected. System is running cleanly.
                  </div>
                )}
                {watchdog?.lastReasons && watchdog.lastReasons.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Last Run Reasons</span>
                    <div className="space-y-1">
                      {watchdog.lastReasons.map((reason, i) => (
                        <div key={i} className="text-[10px] text-slate-400 font-mono">
                          - {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Recommended Next Actions ({watchdog?.nextActions?.length ?? 0})</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {watchdog?.nextActions && watchdog.nextActions.length > 0 ? (
                  watchdog.nextActions.map((action, i) => (
                    <div key={i} className="text-xs border border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400 p-2.5 rounded-lg font-mono">
                      ⚡ {action}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 p-2 border border-line bg-card rounded-lg">
                    No pending actions.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostics Execution Output */}
          {checkResult && (
            <div className="mt-4 border border-line rounded-lg bg-card p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Check Execution Log</span>
                <button className="text-[10px] text-slate-400 hover:text-slate-200" onClick={() => setCheckResult(null)}>Clear</button>
              </div>
              <div className="text-xs font-mono max-h-40 overflow-y-auto space-y-1 bg-slate-950 p-2.5 rounded text-slate-300">
                <div>[SYSTEM] Check started at {new Date(checkResult.startedAt || new Date()).toLocaleTimeString()}</div>
                <div>[SYSTEM] Action: {checkResult.action} ({checkResult.source || 'api'})</div>
                {checkResult.reasons && checkResult.reasons.length > 0 ? (
                  checkResult.reasons.map((r, i) => (
                    <div key={i} className="text-yellow-500">- Reason for action: {r}</div>
                  ))
                ) : (
                  <div className="text-emerald-500">- Status check: All criteria met. No fix actions required.</div>
                )}
                {checkResult.autoFix && (
                  <div className="text-sky-400">
                    [AUTO-FIX] Preset used: {checkResult.autoFix.preset}<br />
                    - Doctor cleanup: {JSON.stringify(checkResult.autoFix.doctor)}<br />
                    - Cleaner results: {JSON.stringify(checkResult.autoFix.cleaner)}<br />
                    - Copy sweep results: {JSON.stringify(checkResult.autoFix.copySweep)}
                  </div>
                )}
                <div>[SYSTEM] Check finished at {new Date(checkResult.finishedAt || new Date()).toLocaleTimeString()}</div>
                <div className="font-semibold text-emerald-400">[SYSTEM] Uptime health: {checkResult.after?.readyScore ?? checkResult.status?.readyScore}% ready ({checkResult.after?.status ?? checkResult.status?.status})</div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_.95fr]">
        <Panel title="Weekly Profit Trend / ہفتہ وار منافع">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profit.daily || []}>
                <CartesianGrid stroke="#94a3b822" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="profit" stroke="#15c59b" fill="#15c59b33" strokeWidth={2} />
                <Area type="monotone" dataKey="revenue" stroke="#38bdf8" fill="#38bdf822" strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top Tools by Sales / سب سے زیادہ سیل">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(profit.topTools || []).slice(0, 6)}>
                <CartesianGrid stroke="#94a3b822" />
                <XAxis dataKey="tool" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="quantity" fill="#15c59b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_.9fr_.85fr]">
        <Panel title="Recent Orders / حالیہ آرڈرز">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Order</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Tool</th>
                  <th className="table-th">Profit</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).slice(0, 8).map((row) => (
                  <tr key={row.id || row.orderId}>
                    <td className="table-td font-bold">{row.orderId}</td>
                    <td className="table-td">
                      <div className="font-semibold">{row.customer?.name || row.customerName || 'Customer'}</div>
                      <div className="text-xs text-slate-400">{row.customer?.whatsapp || row.customerWhatsapp}</div>
                    </td>
                    <td className="table-td">{row.tool?.name} {row.plan?.name || row.plan}</td>
                    <td className="table-td text-emerald-400">Rs {Number(row.profit || 0).toLocaleString()}</td>
                    <td className="table-td"><StatusBadge tone={row.status === 'delivered' ? 'good' : row.status === 'cancelled' ? 'bad' : 'warn'}>{row.status}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Low Stock Alerts / کم اسٹاک">
          <div className="space-y-3">
            {lowStock.map((row) => {
              const qty = Number(row.quantityAvailable ?? row.availableQty ?? 0);
              const max = Number(row.quantityTotal || row.lowStockThreshold || 3);
              return (
                <div key={row.id || `${row.toolSlug}-${row.planSlug}-${row.accountType}`} className={`rounded-xl border p-3 ${qty === 0 ? 'border-red-500/40 bg-red-500/10' : 'border-yellow-500/40 bg-yellow-500/10'}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-semibold">{row.toolSlug || row.tool?.name} {row.planSlug || row.plan}</div>
                    <StatusBadge tone={qty === 0 ? 'bad' : 'warn'}>{qty === 0 ? 'Out' : 'Low'}</StatusBadge>
                  </div>
                  <ProgressBar value={qty} max={max} tone={qty === 0 ? 'bad' : 'warn'} />
                  <div className="mt-2 text-xs text-slate-400">Qty {qty}/{max} | Dealer {row.primaryDealerCode || 'N/A'}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Alerts / الرٹس">
          <div className="space-y-3">
            {(summary.alerts || []).slice(0, 5).map((alert) => (
              <div key={alert.id || alert.title} className="rounded-xl border border-line bg-card p-3">
                <StatusBadge tone={alert.severity === 'warning' ? 'warn' : 'info'}>{alert.severity || 'info'}</StatusBadge>
                <div className="mt-2 text-sm font-semibold">{alert.title || alert.message}</div>
              </div>
            ))}
            {pendingTrust.slice(0, 2).map((row) => (
              <div key={row.id} className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                Trust vote pending: <span className="font-bold">{row.dealerName || row.dealerNumber}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
