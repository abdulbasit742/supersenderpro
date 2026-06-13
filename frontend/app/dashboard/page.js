'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../../components/AppShell';
import KpiCard from '../../components/KpiCard';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { safeApi } from '../../lib/api';
import { overview as demoOverview, profit as demoProfit, orders as demoOrders, stockInventory as demoStock, pendingTrust as demoPendingTrust } from '../../lib/demoData';

export default function DashboardPage() {
  const [summary, setSummary] = useState(demoOverview);
  const [profit, setProfit] = useState(demoProfit);
  const [orders, setOrders] = useState(demoOrders);
  const [stock, setStock] = useState(demoStock);
  const [pendingTrust, setPendingTrust] = useState(demoPendingTrust);

  async function load() {
    const [overview, profitRows, orderRows, stockRows, pendingRows] = await Promise.all([
      safeApi('/api/business/overview', demoOverview),
      safeApi('/api/analytics/profit?days=7', demoProfit),
      safeApi('/api/business/orders?limit=8', demoOrders),
      safeApi('/api/business/stock-inventory', demoStock),
      safeApi('/api/dealer-intelligence/pending', demoPendingTrust)
    ]);
    setSummary(overview);
    setProfit(profitRows);
    setOrders(orderRows);
    setStock(stockRows);
    setPendingTrust(pendingRows);
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
