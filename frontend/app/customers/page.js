'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { safeApi } from '../../lib/api';
import { customers as demoCustomers, notifyMe as demoNotify } from '../../lib/demoData';

function normalizeCustomer(row) {
  return {
    id: row.id,
    name: row.name || 'Customer',
    whatsapp: row.whatsapp || row.whatsappNumber || row.customerWhatsapp || '',
    totalOrders: Number(row.totalOrders || row.total_orders || row.sales?.length || 0),
    totalSpent: Number(row.totalSpent || row.total_spent || 0),
    isVip: Boolean(row.isVip ?? row.is_vip),
    isScammer: Boolean(row.isScammer ?? row.is_scammer ?? row.isBlocked),
    lastOrder: row.lastOrder || row.last_order || row.lastOrderDate || '-'
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState(demoCustomers);
  const [notify, setNotify] = useState(demoNotify);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    const [customerRows, notifyRows] = await Promise.all([
      safeApi('/api/customers', demoCustomers),
      safeApi('/api/business/notify-me', demoNotify)
    ]);
    setCustomers(customerRows.length ? customerRows : demoCustomers);
    setNotify(notifyRows.length ? notifyRows : demoNotify);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => customers.map(normalizeCustomer).filter((row) => {
    const hay = `${row.name} ${row.whatsapp}`.toLowerCase();
    if (query && !hay.includes(query.toLowerCase())) return false;
    if (filter === 'vip' && !row.isVip) return false;
    if (filter === 'scammer' && !row.isScammer) return false;
    return true;
  }), [customers, query, filter]);

  const vipCount = rows.filter((row) => row.isVip).length;
  const scammers = rows.filter((row) => row.isScammer);

  return (
    <AppShell title="Customers / CRM">
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Profiles"><div className="text-3xl font-black">{customers.length}</div><div className="text-sm text-slate-400">Saved customers</div></Panel>
        <Panel title="VIP Customers"><div className="text-3xl font-black text-emerald-300">{vipCount}</div><div className="text-sm text-slate-400">High repeat buyers</div></Panel>
        <Panel title="Scammer Blacklist"><div className="text-3xl font-black text-red-300">{scammers.length}</div><div className="text-sm text-slate-400">Blocked / flagged</div></Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_.85fr]">
        <Panel title="Customer Profiles / کسٹمرز">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
            <input className="input" placeholder="Search customer or WhatsApp" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All customers</option>
              <option value="vip">VIP only</option>
              <option value="scammer">Scammer blacklist</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Orders</th>
                  <th className="table-th">Spent</th>
                  <th className="table-th">Last order</th>
                  <th className="table-th">Flags</th>
                  <th className="table-th">Contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id || row.whatsapp}>
                    <td className="table-td"><div className="font-bold">{row.name}</div><div className="text-xs text-slate-400">{row.whatsapp}</div></td>
                    <td className="table-td">{row.totalOrders}</td>
                    <td className="table-td text-emerald-400">Rs {row.totalSpent.toLocaleString()}</td>
                    <td className="table-td">{String(row.lastOrder)}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        {row.isVip ? <StatusBadge tone="good">VIP</StatusBadge> : <StatusBadge>Standard</StatusBadge>}
                        {row.isScammer ? <StatusBadge tone="bad">Scammer</StatusBadge> : null}
                      </div>
                    </td>
                    <td className="table-td"><a className="btn" href={`https://wa.me/${row.whatsapp}`} target="_blank">WhatsApp</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Notify-Me Waiting / انتظار لسٹ">
          <div className="space-y-3">
            {notify.map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-card p-4">
                <div className="font-bold">{row.tool?.name || row.toolName} {row.plan?.name || row.planName}</div>
                <div className="text-sm text-slate-400">{row.phone || row.customer?.whatsapp} | {row.accountType}</div>
                <div className="mt-2"><StatusBadge tone={row.status === 'waiting' ? 'warn' : 'good'}>{row.status}</StatusBadge></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Scammer Blacklist / بلاک لسٹ">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scammers.map((row) => (
              <div key={row.id || row.whatsapp} className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="font-bold">{row.name}</div>
                <div className="text-sm text-slate-300">{row.whatsapp}</div>
                <div className="mt-2 text-xs text-red-200">Warning shown everywhere in CRM and bot admin views.</div>
              </div>
            ))}
            {!scammers.length ? <div className="text-sm text-slate-400">No scammer flags.</div> : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
