'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import KpiCard from '../../components/KpiCard';
import { api } from '../../lib/api';

export default function PurchasesPage() {
  const [rows, setRows] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [form, setForm] = useState({ dealerId: '', toolName: 'ChatGPT', plan: 'Plus', quantity: 1, buyPriceEach: 1850 });
  const [filters, setFilters] = useState({ from: '', to: '' });

  async function load() {
    const [purchaseRows, dealerRows] = await Promise.all([api('/api/purchases'), api('/api/dealers')]);
    setRows(purchaseRows);
    setDealers(dealerRows);
    if (!form.dealerId && dealerRows[0]) setForm((current) => ({ ...current, dealerId: dealerRows[0].id }));
  }

  useEffect(() => {
    load();
  }, []);

  async function savePurchase(e) {
    e.preventDefault();
    await api('/api/purchases', { method: 'POST', body: JSON.stringify(form) });
    await load();
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const date = new Date(row.purchaseDate);
      if (filters.from && date < new Date(filters.from)) return false;
      if (filters.to && date > new Date(`${filters.to}T23:59:59`)) return false;
      return true;
    });
  }, [rows, filters]);

  const summary = filtered.reduce((acc, row) => {
    const estimatedSell = Number(row.toolPlan?.defaultSellPrice || Math.ceil(row.buyPriceEach * 1.25));
    const estimatedProfit = (estimatedSell - Number(row.buyPriceEach)) * Number(row.quantity);
    acc.cost += Number(row.totalCost || 0);
    acc.profit += estimatedProfit;
    return acc;
  }, { cost: 0, profit: 0 });

  return (
    <AppShell title="Purchase History">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Filtered Purchases" value={filtered.length} />
        <KpiCard label="Total Cost" value={`Rs.${Number(summary.cost).toLocaleString()}`} />
        <KpiCard label="Estimated Profit" value={`Rs.${Number(summary.profit).toLocaleString()}`} tone="good" />
        <KpiCard label="Priority Dealer Orders" value={filtered.filter((row) => row.dealer?.priority).length} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Add Purchase">
          <form onSubmit={savePurchase} className="grid gap-3">
            <select className="input" value={form.dealerId} onChange={(e) => setForm({ ...form, dealerId: e.target.value })}>
              {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.priority ? 'Priority - ' : ''}{dealer.name}</option>)}
            </select>
            <input className="input" value={form.toolName} onChange={(e) => setForm({ ...form, toolName: e.target.value })} placeholder="Tool name" />
            <input className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Plan name" />
            <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity" />
            <input className="input" type="number" value={form.buyPriceEach} onChange={(e) => setForm({ ...form, buyPriceEach: e.target.value })} placeholder="Buy price each" />
            <button className="btn btn-primary">Save Purchase</button>
          </form>
        </Panel>

        <Panel title="Purchase Table" action={<a className="btn" href="http://localhost:4100/api/purchases/export.xlsx">Export to Excel</a>}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <input className="input md:w-48" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <input className="input md:w-48" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Tool</th>
                  <th className="table-th">Dealer</th>
                  <th className="table-th">Qty</th>
                  <th className="table-th">Buy Price</th>
                  <th className="table-th">Sell Price</th>
                  <th className="table-th">Profit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const estimatedSell = Number(row.toolPlan?.defaultSellPrice || Math.ceil(row.buyPriceEach * 1.25));
                  const estimatedProfit = (estimatedSell - Number(row.buyPriceEach)) * Number(row.quantity);
                  return (
                    <tr key={row.id} className={row.dealer?.priority ? 'bg-emerald-500/5' : ''}>
                      <td className="table-td">{new Date(row.purchaseDate).toLocaleDateString()}</td>
                      <td className="table-td">{row.tool?.name} {row.plan}</td>
                      <td className="table-td">
                        <div className="font-semibold">{row.dealer?.priority ? 'Priority - ' : ''}{row.dealer?.name}</div>
                      </td>
                      <td className="table-td">{row.quantity}</td>
                      <td className="table-td">Rs.{Number(row.buyPriceEach).toLocaleString()}</td>
                      <td className="table-td">Rs.{estimatedSell.toLocaleString()}</td>
                      <td className="table-td text-emerald-400">Rs.{estimatedProfit.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
