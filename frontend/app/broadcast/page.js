'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { safeApi } from '../../lib/api';
import { broadcasts as demoBroadcasts, dealerRates as demoRates } from '../../lib/demoData';

const demoGroups = [
  { id: 'g1', name: 'Customer Offers PK', waGroupId: '120363000000101@g.us', type: 'CUSTOMER', broadcastEnabled: true },
  { id: 'g2', name: 'VIP Renewals', waGroupId: '120363000000102@g.us', type: 'CUSTOMER', broadcastEnabled: true }
];

export default function BroadcastPage() {
  const [groups, setGroups] = useState(demoGroups);
  const [rates, setRates] = useState(demoRates);
  const [logs, setLogs] = useState(demoBroadcasts);
  const [form, setForm] = useState({
    title: 'Daily Rate Broadcast',
    message: '🔥 Today AI Tools Offers\n\n{{tool}} - Rs {{price}}\nDate: {{date}}\n\nReply 1 for rates, 2 for availability.',
    selectedGroups: ['120363000000101@g.us'],
    scheduledAt: ''
  });

  async function load() {
    const [groupRows, rateRows, logRows] = await Promise.all([
      safeApi('/api/whatsapp/group-settings', demoGroups),
      safeApi('/api/dealer-intelligence/rates?limit=30', demoRates),
      safeApi('/api/broadcast', demoBroadcasts)
    ]);
    setGroups(groupRows.length ? groupRows : demoGroups);
    setRates(rateRows.length ? rateRows : demoRates);
    setLogs(logRows.length ? logRows : demoBroadcasts);
  }

  useEffect(() => { load(); }, []);

  const targetGroups = groups.filter((group) => group.broadcastEnabled || group.type === 'CUSTOMER');
  const autoMessage = useMemo(() => {
    const rows = rates.slice(0, 8).map((row) => {
      const tool = row.toolName || row.toolSlug || 'Tool';
      const plan = row.planName || row.planSlug || '';
      const price = Number(row.sellPrice || row.price || row.buyPrice || 999).toLocaleString();
      return `• ${tool} ${plan} — Rs ${price}`;
    });
    return `🔥 *Today AI Tools Rates*\n━━━━━━━━━━━━━━━━━━━━\n${rows.join('\n')}\n\n✅ Fast delivery\n✅ Warranty options available\n✅ Private Rs 999 limited slots\n\nReply *order* to buy.`;
  }, [rates]);

  const preview = form.message
    .replaceAll('{{date}}', new Date().toLocaleDateString())
    .replaceAll('{{tool}}', 'ChatGPT Plus')
    .replaceAll('{{price}}', '999')
    .replaceAll('{{dealer}}', 'D-001');

  async function sendNow() {
    await safeApi('/api/broadcast/send', { ok: true }, {
      method: 'POST',
      body: JSON.stringify({ title: form.title, message: form.message, groupIds: form.selectedGroups })
    });
    await load();
  }

  async function schedule() {
    if (!form.scheduledAt) return;
    const date = new Date(form.scheduledAt);
    const cronTime = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    await safeApi('/api/broadcast/schedule', { ok: true }, {
      method: 'POST',
      body: JSON.stringify({ title: form.title, cronTime, message: form.message, groupIds: form.selectedGroups })
    });
    await load();
  }

  return (
    <AppShell title="Broadcast / Campaigns">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Panel title="Message Composer">
          <div className="grid gap-3">
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Broadcast title" />
            <textarea className="input min-h-64" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <div className="flex flex-wrap gap-2 text-xs">
              <StatusBadge>{'{{tool}}'}</StatusBadge>
              <StatusBadge>{'{{price}}'}</StatusBadge>
              <StatusBadge>{'{{dealer}}'}</StatusBadge>
              <StatusBadge>{'{{date}}'}</StatusBadge>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <button className="btn" onClick={() => setForm({ ...form, message: autoMessage })}>Auto-generate Daily Rates</button>
              <button className="btn btn-primary" onClick={sendNow}>Send Now</button>
            </div>
          </div>
        </Panel>

        <Panel title="Targets + Scheduler">
          <div className="grid gap-4">
            <div className="rounded-xl border border-line bg-card p-4">
              <div className="mb-3 text-sm font-bold">Target customer groups</div>
              <div className="space-y-2">
                {targetGroups.map((group) => (
                  <label key={group.id || group.waGroupId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.selectedGroups.includes(group.waGroupId)}
                      onChange={(e) => setForm((current) => ({
                        ...current,
                        selectedGroups: e.target.checked
                          ? [...current.selectedGroups, group.waGroupId]
                          : current.selectedGroups.filter((item) => item !== group.waGroupId)
                      }))}
                    />
                    {group.name}
                  </label>
                ))}
              </div>
            </div>
            <input className="input" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            <button className="btn btn-primary" onClick={schedule}>Schedule Broadcast</button>
            <div className="rounded-xl border border-line bg-card p-4">
              <div className="mb-2 text-sm font-bold">Preview before send</div>
              <pre className="whitespace-pre-wrap text-xs">{preview}</pre>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Sent Broadcasts History">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Title</th>
                  <th className="table-th">Message</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Delivered</th>
                  <th className="table-th">Read</th>
                  <th className="table-th">Replies</th>
                  <th className="table-th">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td className="table-td font-bold">{row.title || 'Broadcast'}</td>
                    <td className="table-td max-w-md truncate">{row.message}</td>
                    <td className="table-td"><StatusBadge tone={row.status === 'sent' || row.status === 'SENT' ? 'good' : 'warn'}>{row.status}</StatusBadge></td>
                    <td className="table-td">{row.delivered || row.result?.sent?.length || '-'}</td>
                    <td className="table-td">{row.read || '-'}</td>
                    <td className="table-td">{row.replies || '-'}</td>
                    <td className="table-td">{row.sentAt ? new Date(row.sentAt).toLocaleString() : row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : '-'}</td>
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
