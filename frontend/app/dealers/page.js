'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { api, safeApi } from '../../lib/api';
import { trustedDealers as demoTrusted, pendingTrust as demoPending } from '../../lib/demoData';

function normalizeDealer(row) {
  const status = row.status || (row.isScammer || row.is_scammer ? 'scammer' : row.pending ? 'pending' : 'trusted');
  return {
    id: row.id || row.dealerCode || row.dealer_code,
    dealerCode: row.dealerCode || row.dealer_code || 'D-000',
    name: row.dealerName || row.dealer_name || row.name || 'Unknown dealer',
    number: row.dealerNumber || row.dealer_number || row.whatsapp_number || row.whatsappNumber || '',
    tools: row.toolsList || row.tools_list || row.tools_available || row.toolsAvailable || [],
    avgPrice: Number(row.avgPrice || row.avg_price || 0),
    lowest: Number(row.lowestPrice || row.lowest_price || 0),
    trust: Number(row.trustScore || row.trust_score || 0),
    orders: Number(row.ordersCompleted || row.orders_completed || row.total_orders_placed || 0),
    priority: Boolean(row.priority || row.isPriority || row.trustScore >= 90),
    status,
    evidence: row.evidenceMessage || row.scamNotes || row.reason || ''
  };
}

export default function DealersPage() {
  const [trusted, setTrusted] = useState(demoTrusted);
  const [pending, setPending] = useState(demoPending);
  const [scammers, setScammers] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [manual, setManual] = useState({ dealerNumber: '', dealerName: '', toolsList: 'chatgpt, claude' });

  async function load() {
    const [trustedRows, pendingRows, scamRows] = await Promise.all([
      safeApi('/api/dealer-intelligence/trusted', demoTrusted),
      safeApi('/api/dealer-intelligence/pending', demoPending),
      safeApi('/api/dealer-intelligence/scammers', [])
    ]);
    setTrusted(trustedRows.length ? trustedRows : demoTrusted);
    setPending(pendingRows.length ? pendingRows : demoPending);
    setScammers(scamRows);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const trustedRows = trusted.map((row) => normalizeDealer({ ...row, status: 'trusted' }));
    const pendingRows = pending.map((row) => normalizeDealer({ ...row, status: 'pending', dealerCode: row.dealerCode || 'PENDING' }));
    const scamRows = scammers.map((row) => normalizeDealer({ ...row, status: 'scammer', dealerCode: row.dealerCode || 'SCAM' }));
    return [...trustedRows, ...pendingRows, ...scamRows].filter((row) => {
    const tools = Array.isArray(row.tools) ? row.tools.join(' ') : row.tools;
    const hay = `${row.dealerCode} ${row.name} ${row.number} ${tools}`.toLowerCase();
    if (query && !hay.includes(query.toLowerCase())) return false;
    if (filter === 'high_trust' && row.trust < 85) return false;
    if (filter === 'low_trust' && row.trust >= 85) return false;
    if (filter === 'pending' && row.status !== 'pending') return false;
    if (filter === 'scammer' && row.status !== 'scammer') return false;
    return true;
    }).sort((a, b) => {
      const rank = { trusted: 1, pending: 2, scammer: 3 };
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return (b.trust || 0) - (a.trust || 0);
    });
  }, [trusted, pending, scammers, query, filter]);

  async function addTrusted(e) {
    e.preventDefault();
    await api('/api/dealer-intelligence/trusted', {
      method: 'POST',
      body: JSON.stringify({
        dealerNumber: manual.dealerNumber,
        dealerName: manual.dealerName,
        toolsList: manual.toolsList.split(',').map((item) => item.trim()).filter(Boolean),
        manual: true
      })
    });
    setManual({ dealerNumber: '', dealerName: '', toolsList: 'chatgpt, claude' });
    await load();
  }

  async function vote(row, voteValue) {
    await safeApi('/api/dealer-intelligence/vote', {}, {
      method: 'POST',
      body: JSON.stringify({
        dealerNumber: row.dealerNumber || row.dealer_number,
        voterNumber: 'dashboard-admin',
        vote: voteValue
      })
    });
    await load();
  }

  return (
    <AppShell title="Dealers / Dealer Intelligence">
      <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <Panel title="Manual Trust Add">
          <form onSubmit={addTrusted} className="grid gap-3">
            <input className="input" value={manual.dealerNumber} onChange={(e) => setManual({ ...manual, dealerNumber: e.target.value })} placeholder="923001234567" />
            <input className="input" value={manual.dealerName} onChange={(e) => setManual({ ...manual, dealerName: e.target.value })} placeholder="Dealer name" />
            <input className="input" value={manual.toolsList} onChange={(e) => setManual({ ...manual, toolsList: e.target.value })} placeholder="chatgpt, claude" />
            <button className="btn btn-primary">Trust Dealer</button>
            <div className="text-xs text-slate-500 dark:text-slate-400">Admin command equivalent: <span className="font-mono">!trust number</span></div>
          </form>
        </Panel>

        <Panel title="Dealer Directory / D-Code List">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search D-code, name, number or tool" />
            <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All trusted</option>
              <option value="high_trust">High trust 85%+</option>
              <option value="low_trust">Needs review</option>
              <option value="pending">Pending</option>
              <option value="scammer">Scammer</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">D-code</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Number</th>
                  <th className="table-th">Tools</th>
                  <th className="table-th">Avg Price</th>
                  <th className="table-th">Lowest</th>
                  <th className="table-th">Trust %</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((dealer) => (
                  <tr
                    key={`${dealer.status}-${dealer.id || dealer.number}`}
                    className={dealer.status === 'scammer' ? 'bg-red-500/10' : dealer.status === 'pending' ? 'bg-yellow-500/10' : 'bg-emerald-500/5'}
                  >
                    <td className="table-td"><StatusBadge tone="info">{dealer.dealerCode}</StatusBadge></td>
                    <td className="table-td">
                      <div className="font-bold">{dealer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{dealer.orders} completed orders</div>
                    </td>
                    <td className="table-td">{dealer.number}</td>
                    <td className="table-td">{Array.isArray(dealer.tools) ? dealer.tools.join(', ') : dealer.tools}</td>
                    <td className="table-td">Rs {dealer.avgPrice.toLocaleString()}</td>
                    <td className="table-td text-emerald-600 dark:text-emerald-300">Rs {dealer.lowest.toLocaleString()}</td>
                    <td className="table-td min-w-36">
                      <ProgressBar value={dealer.trust} max={100} tone={dealer.trust >= 85 ? 'good' : 'warn'} />
                      <div className="mt-1 text-xs">{dealer.trust.toFixed(1)}%</div>
                    </td>
                    <td className="table-td">
                      <StatusBadge tone={dealer.status === 'scammer' ? 'bad' : dealer.status === 'pending' ? 'warn' : 'good'}>{dealer.status}</StatusBadge>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <a className="btn" href={`https://wa.me/${dealer.number}`} target="_blank">WhatsApp</a>
                        <button className="btn" onClick={() => navigator.clipboard?.writeText(dealer.number)}>Copy Number</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Pending Trust Verification">
          <div className="space-y-3">
            {pending.map((row) => (
              <div key={row.id} className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{row.dealerName || row.dealer_name || row.dealerNumber || row.dealer_number}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.groupName || row.group_name || row.groupId || row.group_id}</div>
                  </div>
                  <StatusBadge tone="warn">Pending</StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-card p-3">YES votes: <span className="font-bold text-emerald-600 dark:text-emerald-300">{row.yesVotes ?? row.yes_votes ?? 0}</span></div>
                  <div className="rounded-lg bg-card p-3">NO votes: <span className="font-bold text-red-600 dark:text-red-300">{row.noVotes ?? row.no_votes ?? 0}</span></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-primary" onClick={() => vote(row, 'YES')}>Vote YES</button>
                  <button className="btn" onClick={() => vote(row, 'NO')}>Vote NO</button>
                </div>
              </div>
            ))}
            {!pending.length ? <div className="text-sm text-slate-500">No pending trust votes.</div> : null}
          </div>
        </Panel>

        <Panel title="Scammer Evidence + Trust Rules">
          <div className="grid gap-3 text-sm">
            {scammers.slice(0, 5).map((row) => (
              <div key={row.id || row.number} className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="font-bold text-red-600 dark:text-red-300">{row.number}</div>
                <div>{row.reason || 'Flagged as scammer'}</div>
                {row.evidenceMessage ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{row.evidenceMessage}</div> : null}
              </div>
            ))}
            <div className="rounded-xl border border-line bg-card p-4">3 YES votes automatically creates a sequential D-code, e.g. D-001.</div>
            <div className="rounded-xl border border-line bg-card p-4">3 NO votes flags the number as scammer and stops rate ingestion.</div>
            <div className="rounded-xl border border-line bg-card p-4">Trust score = YES vote weight + completed order weight + accuracy score.</div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
