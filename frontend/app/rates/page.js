'use client';

import { useEffect, useMemo, useState } from 'react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api, safeApi } from '../../lib/api';
import { dealerRates as demoRates, trustedDealers as demoDealers } from '../../lib/demoData';

function normalizeRate(row) {
  const buy = Number(row.buyPrice ?? row.price ?? 0);
  const sell = Number(row.sellPrice ?? (buy ? Math.round(buy * 1.42) : 0));
  return {
    id: row.id,
    tool: row.toolName || row.toolSlug || row.tool_name || 'Unknown',
    toolSlug: row.toolSlug || row.tool_slug || '',
    plan: row.planName || row.planSlug || row.plan || '',
    planSlug: row.planSlug || row.plan_slug || '',
    buyPrice: buy,
    sellPrice: sell,
    dealerName: row.dealer?.name || row.dealerName || row.dealer_name || row.dealerNumber || 'Unverified',
    dealerCode: row.dealer?.dealerCode || row.dealerCode || row.dealer_code || '',
    parsedAt: row.parsedAt || row.createdAt || row.rateDate || new Date().toISOString(),
    trustStatus: row.trustStatus || row.trust_status || 'trusted'
  };
}

function buildBest(rows) {
  const map = new Map();
  rows.forEach((raw) => {
    const row = normalizeRate(raw);
    const key = `${row.toolSlug || row.tool}:${row.planSlug || row.plan}`;
    const existing = map.get(key);
    if (!existing || row.buyPrice < existing.bestPrice) {
      map.set(key, {
        ...row,
        bestPrice: row.buyPrice,
        avgPrice: 0,
        highestPrice: 0,
        profitMargin: row.buyPrice ? ((row.sellPrice - row.buyPrice) / row.buyPrice) * 100 : 0
      });
    }
  });
  return [...map.values()].map((best) => {
    const group = rows.map(normalizeRate).filter((row) => (row.toolSlug || row.tool) === (best.toolSlug || best.tool) && (row.planSlug || row.plan) === (best.planSlug || best.plan));
    const prices = group.map((row) => row.buyPrice);
    return {
      ...best,
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / Math.max(1, prices.length),
      highestPrice: Math.max(...prices, best.bestPrice)
    };
  }).sort((a, b) => a.tool.localeCompare(b.tool));
}

export default function RatesPage() {
  const [rates, setRates] = useState(demoRates);
  const [dealers, setDealers] = useState(demoDealers);
  const [selected, setSelected] = useState('chatgpt');
  const [history, setHistory] = useState([]);
  const [calc, setCalc] = useState({ buy: 1750, sell: 2600, qty: 10, margin: 30 });
  const [form, setForm] = useState({ dealerNumber: '923001112233', dealerName: 'Ali Raza', message: 'ChatGPT Plus 1750, Claude Pro 1650', groupName: 'AI Dealers PK' });

  async function load() {
    const [rateRows, trustedRows] = await Promise.all([
      safeApi('/api/dealer-intelligence/rates?limit=300', demoRates),
      safeApi('/api/dealer-intelligence/trusted', demoDealers)
    ]);
    const normalized = rateRows.length ? rateRows : demoRates;
    setRates(normalized);
    setDealers(trustedRows.length ? trustedRows : demoDealers);
    const first = buildBest(normalized)[0];
    if (first) setSelected(first.toolSlug || first.tool);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    safeApi(`/api/dealer-intelligence/price-trend/${selected}?days=30`, []).then((rows) => {
      if (rows.length) {
        setHistory(rows.map((row) => ({ date: row.day || row.date, price: row.averagePrice || row.average_price || row.lowestPrice || row.lowest_price })));
      } else {
        setHistory(Array.from({ length: 10 }, (_, i) => ({ date: `D-${9 - i}`, price: Number(calc.buy) + (i % 4) * 35 - 70 })));
      }
    });
  }, [selected]);

  const bestRates = useMemo(() => buildBest(rates), [rates]);
  const compareRows = useMemo(() => rates.map(normalizeRate).filter((row) => (row.toolSlug || row.tool) === selected || row.tool === selected).sort((a, b) => a.buyPrice - b.buyPrice), [rates, selected]);
  const profit = Math.max(0, Number(calc.sell || 0) - Number(calc.buy || 0));
  const marginPct = Number(calc.buy || 0) ? (profit / Number(calc.buy || 1)) * 100 : 0;
  const minSell = Math.ceil(Number(calc.buy || 0) * (1 + Number(calc.margin || 0) / 100));

  async function parseMessage(e) {
    e.preventDefault();
    const result = await safeApi('/api/dealer-intelligence/parse-message', null, {
      method: 'POST',
      body: JSON.stringify(form)
    });
    if (result) await load();
  }

  return (
    <AppShell title="Rates / Dealer Price Intelligence">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.9fr]">
        <Panel title="Live Dealer Rates / آج کے ریٹس">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Tool</th>
                  <th className="table-th">Lowest</th>
                  <th className="table-th">Avg</th>
                  <th className="table-th">Highest</th>
                  <th className="table-th">Best Dealer</th>
                  <th className="table-th">Margin</th>
                </tr>
              </thead>
              <tbody>
                {bestRates.map((row) => (
                  <tr key={`${row.tool}-${row.plan}`} className="cursor-pointer hover:bg-white/5" onClick={() => setSelected(row.toolSlug || row.tool)}>
                    <td className="table-td font-semibold">{row.tool} <span className="text-slate-400">{row.plan}</span></td>
                    <td className="table-td text-emerald-400">Rs {Number(row.bestPrice).toLocaleString()}</td>
                    <td className="table-td">Rs {Number(row.avgPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="table-td text-red-300">Rs {Number(row.highestPrice).toLocaleString()}</td>
                    <td className="table-td">{row.dealerCode ? <StatusBadge tone="info">{row.dealerCode}</StatusBadge> : null} {row.dealerName}</td>
                    <td className="table-td text-emerald-300">{Number(row.profitMargin).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Profit Calculator / منافع کیلکولیٹر">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="number" value={calc.buy} onChange={(e) => setCalc({ ...calc, buy: e.target.value })} placeholder="Buy" />
              <input className="input" type="number" value={calc.sell} onChange={(e) => setCalc({ ...calc, sell: e.target.value })} placeholder="Sell" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="number" value={calc.qty} onChange={(e) => setCalc({ ...calc, qty: e.target.value })} placeholder="Qty" />
              <input className="input" type="number" value={calc.margin} onChange={(e) => setCalc({ ...calc, margin: e.target.value })} placeholder="Desired %" />
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <div className="text-xs text-slate-400">Profit per unit</div>
              <div className="text-2xl font-black text-emerald-400">Rs {profit.toLocaleString()}</div>
              <div className="mt-2 text-sm text-slate-300">Margin: {marginPct.toFixed(1)}%</div>
              <div className="text-sm text-slate-300">Total on {calc.qty} qty: Rs {(profit * Number(calc.qty || 1)).toLocaleString()}</div>
              <div className="text-sm text-yellow-300">Minimum viable sell: Rs {minSell.toLocaleString()}</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_420px]">
        <Panel title={`Dealer Compare / ${selected}`}>
          <div className="space-y-2">
            {compareRows.slice(0, 12).map((row, index) => (
              <div key={`${row.id}-${index}`} className="rounded-xl border border-line bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{index + 1}. {row.dealerName}</div>
                    <div className="text-xs text-slate-400">{row.plan} | {new Date(row.parsedAt).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-400">Rs {row.buyPrice.toLocaleString()}</div>
                    <StatusBadge tone={row.trustStatus === 'trusted' ? 'good' : 'warn'}>{row.dealerCode || row.trustStatus}</StatusBadge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="30-Day Rate History / ریٹ ہسٹری">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="#94a3b822" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#15c59b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Parse Dealer Message">
          <form onSubmit={parseMessage} className="grid gap-3">
            <input className="input" value={form.dealerNumber} onChange={(e) => setForm({ ...form, dealerNumber: e.target.value })} placeholder="Dealer number" />
            <input className="input" value={form.dealerName} onChange={(e) => setForm({ ...form, dealerName: e.target.value })} placeholder="Dealer name" />
            <textarea className="input min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <button className="btn btn-primary">Parse + Save Rate</button>
            <div className="text-xs text-slate-400">Examples: "gpt plus hy 1820", "claude pro: 1650", multiple lines.</div>
          </form>
          <div className="mt-4 text-xs text-slate-400">Trusted dealers: {dealers.length}</div>
        </Panel>
      </div>
    </AppShell>
  );
}
