'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import ProgressBar from '../../components/ProgressBar';
import StatusBadge from '../../components/StatusBadge';
import { api, safeApi } from '../../lib/api';
import { stockInventory as demoStock, availability as demoAvailability, notifyMe as demoNotify } from '../../lib/demoData';

function label(row) {
  return `${row.toolSlug || row.tool_slug || row.tool?.name || 'tool'} ${row.planSlug || row.plan_slug || row.plan || ''}`;
}

export default function StockPage() {
  const [stock, setStock] = useState(demoStock);
  const [availability, setAvailability] = useState(demoAvailability);
  const [notify, setNotify] = useState(demoNotify);
  const [form, setForm] = useState({
    toolSlug: 'chatgpt',
    planSlug: 'plus',
    accountType: 'private',
    quantity: 3,
    quantityTotal: 10,
    primaryDealerCode: 'D-001',
    lowStockThreshold: 3
  });

  async function load() {
    const [stockRows, availabilityRows, notifyRows] = await Promise.all([
      safeApi('/api/business/stock-inventory', demoStock),
      safeApi('/api/business/availability', demoAvailability),
      safeApi('/api/business/notify-me', demoNotify)
    ]);
    setStock(stockRows.length ? stockRows : demoStock);
    setAvailability(availabilityRows.length ? availabilityRows : demoAvailability);
    setNotify(notifyRows.length ? notifyRows : demoNotify);
  }

  useEffect(() => { load(); }, []);

  async function saveInventory(e) {
    e.preventDefault();
    await api('/api/business/stock-inventory', {
      method: 'POST',
      body: JSON.stringify(form)
    });
    await load();
  }

  const low = useMemo(() => stock.filter((row) => Number(row.quantityAvailable || 0) <= Number(row.lowStockThreshold || 3)), [stock]);

  return (
    <AppShell title="Stock / Inventory Management">
      <div className="grid gap-4 xl:grid-cols-[1.45fr_420px]">
        <Panel title="Stock by Tool / اسٹاک">
          <div className="grid gap-3 md:grid-cols-2">
            {stock.map((row) => {
              const qty = Number(row.quantityAvailable || row.quantity_available || 0);
              const max = Number(row.quantityTotal || row.quantity_total || Math.max(qty, 1));
              const threshold = Number(row.lowStockThreshold || row.low_stock_threshold || 3);
              const tone = qty === 0 ? 'bad' : qty <= threshold ? 'warn' : 'good';
              return (
                <div key={row.id || `${row.toolSlug}-${row.planSlug}-${row.accountType}`} className="rounded-xl border border-line bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold capitalize">{label(row)}</div>
                      <div className="text-xs text-slate-400">{row.accountType || row.account_type} | Dealer {row.primaryDealerCode || row.primary_dealer_code || 'N/A'}</div>
                    </div>
                    <StatusBadge tone={tone}>{qty === 0 ? 'Out' : qty <= threshold ? 'Low' : 'Ready'}</StatusBadge>
                  </div>
                  <ProgressBar value={qty} max={max} tone={tone} />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>Qty {qty}/{max}</span>
                    <button className="btn" onClick={() => setForm({
                      toolSlug: row.toolSlug || row.tool_slug,
                      planSlug: row.planSlug || row.plan_slug,
                      accountType: row.accountType || row.account_type,
                      quantity: qty,
                      quantityTotal: max,
                      primaryDealerCode: row.primaryDealerCode || row.primary_dealer_code || 'D-001',
                      lowStockThreshold: threshold
                    })}>Update</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Update Stock / اسٹاک اپڈیٹ">
          <form onSubmit={saveInventory} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="input" value={form.toolSlug} onChange={(e) => setForm({ ...form, toolSlug: e.target.value })} placeholder="toolSlug" />
              <input className="input" value={form.planSlug} onChange={(e) => setForm({ ...form, planSlug: e.target.value })} placeholder="planSlug" />
            </div>
            <select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
              <option value="private">Private</option>
              <option value="warranty">Warranty</option>
              <option value="non_warranty">Non-Warranty</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qty" />
              <input className="input" type="number" value={form.quantityTotal} onChange={(e) => setForm({ ...form, quantityTotal: e.target.value })} placeholder="Max" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" value={form.primaryDealerCode} onChange={(e) => setForm({ ...form, primaryDealerCode: e.target.value })} placeholder="D-001" />
              <input className="input" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} placeholder="Threshold" />
            </div>
            <button className="btn btn-primary">Save Stock</button>
            <div className="text-xs text-slate-400">Stock added hone par notify-me waiting customers auto-ready state mein aa jate hain.</div>
          </form>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Low Stock Alerts / الرٹس">
          <div className="space-y-3">
            {low.map((row) => (
              <div key={row.id || `${row.toolSlug}-${row.planSlug}-${row.accountType}`} className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold capitalize">{label(row)}</div>
                  <StatusBadge tone={Number(row.quantityAvailable || 0) === 0 ? 'bad' : 'warn'}>{Number(row.quantityAvailable || 0) === 0 ? 'Out of stock' : 'Low stock'}</StatusBadge>
                </div>
                <div className="mt-2 text-sm text-slate-300">Primary dealer: {row.primaryDealerCode || row.primary_dealer_code || 'N/A'}</div>
                <div className="mt-3"><ProgressBar value={Number(row.quantityAvailable || 0)} max={Number(row.quantityTotal || 1)} tone={Number(row.quantityAvailable || 0) === 0 ? 'bad' : 'warn'} /></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Customer-Facing Availability / دستیابی">
          <div className="grid gap-3 md:grid-cols-2">
            {availability.slice(0, 12).map((row) => (
              <div key={`${row.toolSlug}-${row.planSlug}-${row.accountType}`} className={`rounded-xl border p-4 ${row.inStock ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                <div className="font-bold">{row.tool} {row.plan}</div>
                <div className="text-sm text-slate-300">{row.accountLabel} | Rs {Number(row.price || 0).toLocaleString()}</div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge tone={row.inStock ? row.low ? 'warn' : 'good' : 'bad'}>{row.inStock ? `${row.slots} slots` : 'Notify me'}</StatusBadge>
                  {row.limitedTime ? <StatusBadge tone="warn">{row.limitedLabel || 'LIMITED'}</StatusBadge> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Notify-Me Waiting List / انتظار لسٹ">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {notify.map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-card p-4">
                <div className="font-bold">{row.tool?.name || row.toolName} {row.plan?.name || row.planName}</div>
                <div className="text-sm text-slate-400">{row.phone || row.customer?.whatsapp} | {row.accountType}</div>
                <StatusBadge tone={row.status === 'waiting' ? 'warn' : 'good'}>{row.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
