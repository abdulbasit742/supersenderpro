'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import { api } from '../../lib/api';

export default function SalesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ customerName: '', customerWhatsapp: '', toolName: 'ChatGPT', plan: 'Plus', quantity: 1, sellPriceEach: 2500, paymentStatus: 'PAID', deliveryStatus: 'DELIVERED' });
  async function load() { setRows(await api('/api/sales')); }
  useEffect(() => { load(); }, []);
  async function save(e) {
    e.preventDefault();
    await api('/api/sales', { method: 'POST', body: JSON.stringify(form) });
    setForm({ ...form, customerName: '', customerWhatsapp: '' });
    await load();
  }
  return (
    <AppShell title="Sales / سیلز">
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Panel title="Record Sale">
          <form onSubmit={save} className="grid gap-3">
            <input className="input" placeholder="Customer name" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
            <input className="input" placeholder="WhatsApp number" value={form.customerWhatsapp} onChange={e => setForm({ ...form, customerWhatsapp: e.target.value })} />
            <div className="grid grid-cols-2 gap-3"><input className="input" value={form.toolName} onChange={e => setForm({ ...form, toolName: e.target.value })} /><input className="input" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><input className="input" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /><input className="input" type="number" value={form.sellPriceEach} onChange={e => setForm({ ...form, sellPriceEach: e.target.value })} /></div>
            <select className="input" value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}><option>PAID</option><option>PENDING</option><option>PARTIAL</option></select>
            <select className="input" value={form.deliveryStatus} onChange={e => setForm({ ...form, deliveryStatus: e.target.value })}><option>DELIVERED</option><option>PENDING</option><option>FAILED</option></select>
            <button className="btn btn-primary">Save Sale + Reduce Stock</button>
          </form>
        </Panel>
        <Panel title="Sales History" action={<a className="btn" href="http://localhost:4100/api/sales/export.xlsx">Export Excel</a>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-th">Customer</th><th className="table-th">Tool</th><th className="table-th">Revenue</th><th className="table-th">Profit</th><th className="table-th">Payment</th></tr></thead>
              <tbody>{rows.map(r => <tr key={r.id}><td className="table-td">{r.customerName}<div className="text-xs text-slate-400">{r.customerWhatsapp}</div></td><td className="table-td">{r.tool?.name} {r.plan}</td><td className="table-td">Rs.{Number(r.totalRevenue).toLocaleString()}</td><td className="table-td text-mint">Rs.{Number(r.profit).toLocaleString()}</td><td className="table-td">{r.paymentStatus}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
