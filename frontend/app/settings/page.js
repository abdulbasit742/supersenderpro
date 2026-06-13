'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api, safeApi } from '../../lib/api';
import { settings as demoSettings } from '../../lib/demoData';

const pricingRows = [
  ['chatgpt', 'plus', 'private', 999, true],
  ['chatgpt', 'plus', 'warranty', 1800, false],
  ['chatgpt', 'plus', 'non_warranty', 1200, false],
  ['claude', 'pro', 'private', 999, true],
  ['claude', 'pro', 'warranty', 1700, false],
  ['cursor', 'pro', 'warranty', 2100, false],
  ['gemini', 'advanced', 'private', 999, true]
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(demoSettings);
  const [groups, setGroups] = useState([]);
  const [agent, setAgent] = useState({ message: 'ChatGPT Plus price?', tool: 'chatgpt' });
  const [agentResult, setAgentResult] = useState(null);
  const [priceForm, setPriceForm] = useState({ tool: 'chatgpt', plan: 'plus', type: 'private', price: 999, limited: true });
  const [waNumber, setWaNumber] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  async function load() {
    const [saved, groupRows] = await Promise.all([
      safeApi('/api/settings', demoSettings),
      safeApi('/api/whatsapp/group-settings', [])
    ]);
    setSettings(saved);
    setGroups(groupRows);
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setSaveStatus('');
    const required = ['ADMIN_NUMBER', 'LOW_STOCK_THRESHOLD'];
    const missing = required.filter((key) => !String(settings[key] || '').trim());
    if (missing.length) {
      setSaveStatus(`Missing required settings: ${missing.join(', ')}`);
      return;
    }
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
      setSaveStatus('Settings saved successfully.');
      await load();
    } catch (error) {
      setSaveStatus(error.message || 'Settings save failed.');
    }
  }

  async function classify() {
    const params = new URLSearchParams(agent);
    setAgentResult(await safeApi(`/api/business/agent/classify?${params.toString()}`, { intent: 'PRICE_INQUIRY', answer: 'Structured flow: show rates and availability.' }));
  }

  async function updateGroup(group, patch) {
    await safeApi(`/api/whatsapp/group-settings/${group.id}`, group, { method: 'PUT', body: JSON.stringify(patch) });
    await load();
  }

  async function savePricing() {
    setSaveStatus('');
    try {
      await api('/api/settings/pricing', {
        method: 'PUT',
        body: JSON.stringify({
          tool: priceForm.tool,
          plan: priceForm.plan,
          type: priceForm.type,
          price: Number(priceForm.price),
          limited: Boolean(priceForm.limited)
        })
      });
      setSaveStatus('Pricing saved successfully.');
    } catch (error) {
      setSaveStatus(error.message || 'Pricing save failed.');
    }
  }

  return (
    <AppShell title="Settings / System Control">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Admin + Payment Details">
          <form onSubmit={save} className="grid gap-3">
            {['ADMIN_NUMBER', 'JAZZCASH_NUMBER', 'EASYPAISA_NUMBER', 'BANK_ACCOUNT', 'BANK_NAME', 'GOOGLE_SHEETS_ID'].map((key) => (
              <label key={key} className="grid gap-1 text-sm">
                <span className="text-slate-500 dark:text-slate-400">{key}</span>
                <input className="input" value={settings[key] || ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
              </label>
            ))}
            <button className="btn btn-primary">Save Settings</button>
            {saveStatus ? (
              <div className={`rounded-xl border p-3 text-sm ${saveStatus.includes('success') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                {saveStatus}
              </div>
            ) : null}
          </form>
        </Panel>

        <Panel title="WhatsApp Numbers">
          <div className="grid gap-3">
            <div className="flex gap-2">
              <input className="input" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="923001234567" />
              <button className="btn" onClick={() => { setSettings({ ...settings, WHATSAPP_NUMBERS: [...(settings.WHATSAPP_NUMBERS || []), waNumber].filter(Boolean) }); setWaNumber(''); }}>Add</button>
            </div>
            <div className="grid gap-2">
              {(settings.WHATSAPP_NUMBERS || [settings.ADMIN_NUMBER]).filter(Boolean).map((number) => (
                <div key={number} className="rounded-xl border border-line bg-card p-3 text-sm">
                  <StatusBadge tone="good">Linked</StatusBadge> <span className="ml-2 font-bold">{number}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Pricing Table + Limited Toggle">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="input" value={priceForm.tool} onChange={(e) => setPriceForm({ ...priceForm, tool: e.target.value })} />
              <input className="input" value={priceForm.plan} onChange={(e) => setPriceForm({ ...priceForm, plan: e.target.value })} />
            </div>
            <select className="input" value={priceForm.type} onChange={(e) => setPriceForm({ ...priceForm, type: e.target.value })}>
              <option value="private">Private</option>
              <option value="warranty">Warranty</option>
              <option value="non_warranty">Non-Warranty</option>
            </select>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input className="input" type="number" value={priceForm.price} onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })} />
              <label className="btn gap-2">
                <input type="checkbox" checked={priceForm.limited} onChange={(e) => setPriceForm({ ...priceForm, limited: e.target.checked })} />
                Limited
              </label>
            </div>
            <button type="button" className="btn btn-primary" onClick={savePricing}>Save Price Update</button>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full">
                <tbody>
                  {pricingRows.map(([tool, plan, type, price, limited]) => (
                    <tr key={`${tool}-${plan}-${type}`}>
                      <td className="table-td capitalize">{tool} {plan}</td>
                      <td className="table-td">{type}</td>
                      <td className="table-td text-emerald-600 dark:text-emerald-300">Rs {price.toLocaleString()}</td>
                      <td className="table-td">{limited ? <StatusBadge tone="warn">Limited</StatusBadge> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        <Panel title="Low Stock Thresholds">
          <div className="grid gap-4">
            {['chatgpt', 'claude', 'midjourney', 'cursor', 'gemini'].map((tool) => (
              <label key={tool} className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="capitalize">{tool}</span><span>{settings[`LOW_${tool.toUpperCase()}_THRESHOLD`] || settings.LOW_STOCK_THRESHOLD || 3}</span></div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings[`LOW_${tool.toUpperCase()}_THRESHOLD`] || settings.LOW_STOCK_THRESHOLD || 3}
                  onChange={(e) => setSettings({ ...settings, [`LOW_${tool.toUpperCase()}_THRESHOLD`]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Group IDs Manager">
          <div className="grid gap-3">
            {groups.map((group) => (
              <div key={group.id} className="rounded-xl border border-line bg-card p-3">
                <div className="font-bold">{group.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{group.waGroupId}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn" onClick={() => updateGroup(group, { type: 'DEALER', monitorRates: true })}>Selling group</button>
                  <button className="btn" onClick={() => updateGroup(group, { type: 'CUSTOMER', broadcastEnabled: true })}>Customer group</button>
                  <StatusBadge tone={group.type === 'DEALER' ? 'warn' : 'good'}>{group.type}</StatusBadge>
                </div>
              </div>
            ))}
            {!groups.length ? <div className="text-sm text-slate-500">Sync WhatsApp groups first from WhatsApp page.</div> : null}
          </div>
        </Panel>

        <Panel title="Compliant AI Agent Tester">
          <div className="grid gap-3">
            <textarea className="input min-h-28" value={agent.message} onChange={(e) => setAgent({ ...agent, message: e.target.value })} />
            <input className="input" value={agent.tool} onChange={(e) => setAgent({ ...agent, tool: e.target.value })} />
            <button className="btn btn-primary" onClick={classify}>Classify Query</button>
            {agentResult ? (
              <div className="rounded-xl border border-line bg-card p-4">
                <StatusBadge tone="info">{agentResult.intent}</StatusBadge>
                <div className="mt-3 text-sm">{agentResult.answer || 'No direct answer. Route to structured flow or admin handoff.'}</div>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
