'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api, safeApi } from '../../lib/api';
import { orders as demoOrders } from '../../lib/demoData';

export default function OrdersPage() {
  const [orders, setOrders] = useState(demoOrders);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ customerName: '', customerWhatsapp: '', toolSlug: 'chatgpt', planSlug: 'plus', accountType: 'private', quantity: 1 });

  async function load() {
    setOrders(await safeApi('/api/business/orders', demoOrders));
  }

  useEffect(() => { load(); }, []);

  async function createOrder(e) {
    e.preventDefault();
    await api('/api/business/orders', { method: 'POST', body: JSON.stringify(form) });
    setForm({ ...form, customerName: '', customerWhatsapp: '' });
    await load();
  }

  async function action(orderId, name) {
    const body = name === 'reject' ? { reason: 'Payment not verified' } : {};
    await api(`/api/business/orders/${orderId}/${name}`, { method: 'PUT', body: JSON.stringify(body) });
    await load();
  }

  const filtered = useMemo(() => {
    return orders.filter((row) => {
      const hay = `${row.orderId} ${row.customer?.name} ${row.customer?.whatsapp} ${row.tool?.name} ${row.status}`.toLowerCase();
      if (status !== 'all' && row.status !== status) return false;
      if (query && !hay.includes(query.toLowerCase())) return false;
      return true;
    });
  }, [orders, status, query]);

  const pending = orders.filter((row) => ['awaiting_payment', 'awaiting_verification'].includes(row.status));

  return (
    <AppShell title="Orders / Payment Verification">
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="All Orders"><div className="text-3xl font-black">{orders.length}</div><div className="text-sm text-slate-400">Total loaded</div></Panel>
        <Panel title="Pending Verification"><div className="text-3xl font-black text-yellow-300">{pending.length}</div><div className="text-sm text-slate-400">Need admin action</div></Panel>
        <Panel title="Delivered"><div className="text-3xl font-black text-emerald-300">{orders.filter((row) => row.status === 'delivered').length}</div><div className="text-sm text-slate-400">Completed sales</div></Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[420px_1fr]">
        <Panel title="Create Order / آرڈر بنائیں">
          <form onSubmit={createOrder} className="grid gap-3">
            <input className="input" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            <input className="input" placeholder="WhatsApp number" value={form.customerWhatsapp} onChange={(e) => setForm({ ...form, customerWhatsapp: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={form.toolSlug} onChange={(e) => setForm({ ...form, toolSlug: e.target.value })}>
                <option value="chatgpt">ChatGPT</option>
                <option value="claude">Claude</option>
                <option value="midjourney">Midjourney</option>
                <option value="cursor">Cursor</option>
                <option value="gemini">Gemini</option>
              </select>
              <input className="input" value={form.planSlug} onChange={(e) => setForm({ ...form, planSlug: e.target.value })} placeholder="plus" />
            </div>
            <select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
              <option value="private">Private - Rs 999 limited</option>
              <option value="warranty">Warranty - 1 replacement + 2 support</option>
              <option value="non_warranty">Non-warranty - no claims</option>
            </select>
            <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <button className="btn btn-primary">Create Order</button>
          </form>
        </Panel>

        <Panel title="Order Queue / آرڈر لسٹ">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order/customer/tool" />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="awaiting_payment">Awaiting payment</option>
              <option value="awaiting_verification">Pending verification</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Order</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Tool</th>
                  <th className="table-th">Profit</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Issues</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id || row.orderId}>
                    <td className="table-td font-bold">{row.orderId}</td>
                    <td className="table-td"><div className="font-semibold">{row.customer?.name}</div><div className="text-xs text-slate-400">{row.customer?.whatsapp}</div></td>
                    <td className="table-td">{row.tool?.name} {row.plan?.name}<div className="text-xs text-slate-400">{row.accountType?.label}</div></td>
                    <td className="table-td text-emerald-400">Rs {Number(row.profit || 0).toLocaleString()}</td>
                    <td className="table-td"><StatusBadge tone={row.status === 'delivered' ? 'good' : row.status === 'cancelled' ? 'bad' : 'warn'}>{row.status}</StatusBadge></td>
                    <td className="table-td">{row.issues?.length ? <StatusBadge tone="warn">{row.issues.length} issue</StatusBadge> : <StatusBadge>None</StatusBadge>}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn" onClick={() => action(row.orderId, 'approve')}>Approve</button>
                        <button className="btn" onClick={() => action(row.orderId, 'reject')}>Reject</button>
                        <button className="btn" onClick={() => action(row.orderId, 'replace')}>Replace</button>
                      </div>
                    </td>
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
