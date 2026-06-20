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
  const [setupCheck, setSetupCheck] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [aiTestPrompt, setAiTestPrompt] = useState('Hello, AI!');
  const [aiTestResponse, setAiTestResponse] = useState('');
  const [aiTesting, setAiTesting] = useState(false);

  async function testAiModel() {
    setAiTesting(true);
    setAiTestResponse('');
    try {
      const res = await api('/api/settings/ai-test', {
        method: 'POST',
        body: JSON.stringify({ prompt: aiTestPrompt })
      });
      if (res.success) {
        setAiTestResponse(res.response);
      } else {
        setAiTestResponse('Error: ' + res.error);
      }
    } catch (err) {
      setAiTestResponse('Failed to execute test prompt: ' + err.message);
    } finally {
      setAiTesting(false);
    }
  }

  async function load() {
    const [saved, groupRows, setupRes] = await Promise.all([
      safeApi('/api/settings', demoSettings),
      safeApi('/api/whatsapp/group-settings', []),
      safeApi('/api/system/setup-validator', null)
    ]);
    setSettings(saved);
    setGroups(groupRows);
    if (setupRes) setSetupCheck(setupRes);
  }

  async function refreshSetupCheck() {
    setLoadingSetup(true);
    try {
      const res = await api('/api/system/setup-validator');
      setSetupCheck(res);
    } catch (error) {
      console.error('Setup check failed:', error);
    } finally {
      setLoadingSetup(false);
    }
  }

  async function exportChannelConfig() {
    try {
      const data = await api('/api/wa/channels/export-config');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-channel-settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  }

  async function importChannelConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus('Importing...');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const config = JSON.parse(event.target.result);
          const res = await api('/api/wa/channels/import-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
          if (res.success) {
            setImportStatus(`Success! Imported targets: ${res.summary?.targets ?? 0}, sources: ${res.summary?.sources ?? 0}`);
            await load();
          } else {
            setImportStatus(`Import failed: ${res.error}`);
          }
        } catch (err) {
          setImportStatus('Invalid JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      setImportStatus('File read failed: ' + error.message);
    }
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

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="AI Cognitive Model Settings / اے آئی ماڈل سیٹنگز">
          <div className="grid gap-3 text-sm">
            <label className="grid gap-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Active AI Provider</span>
              <select 
                className="input" 
                value={settings.ai_provider || 'groq'} 
                onChange={(e) => setSettings({ ...settings, ai_provider: e.target.value })}
              >
                <option value="groq">Groq Cloud (Llama 3, Mixtral)</option>
                <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="gemini">Google Gemini (Gemini 1.5/2.0)</option>
                <option value="deepseek">DeepSeek (DeepSeek V3, R1)</option>
                <option value="openrouter">OpenRouter (Unified Multi-Model)</option>
                <option value="ollama">Ollama (Local Models)</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Active AI Model Name</span>
              <input 
                className="input font-mono" 
                placeholder="e.g. gpt-4o-mini, claude-3-5-sonnet-latest" 
                value={settings.ai_model || ''} 
                onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })} 
              />
            </label>

            {settings.ai_provider === 'ollama' ? (
              <label className="grid gap-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Ollama Local Host URL</span>
                <input 
                  className="input font-mono" 
                  placeholder="http://localhost:11434" 
                  value={settings.ollama_host || ''} 
                  onChange={(e) => setSettings({ ...settings, ollama_host: e.target.value })} 
                />
              </label>
            ) : (
              <label className="grid gap-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Provider API Key</span>
                <input 
                  type="password"
                  className="input font-mono" 
                  placeholder="Paste your API key here" 
                  value={settings[`${settings.ai_provider || 'groq'}_api_key`] || ''} 
                  onChange={(e) => setSettings({ ...settings, [`${settings.ai_provider || 'groq'}_api_key`]: e.target.value })} 
                />
              </label>
            )}

            <button type="button" className="btn btn-primary mt-2" onClick={save}>
              💾 Save AI Configuration
            </button>
          </div>
        </Panel>

        <Panel title="AI Prompt Playground / اے آئی پلے گراؤنڈ">
          <div className="grid gap-3 text-sm">
            <label className="grid gap-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold font-mono">Test Prompt</span>
              <input 
                className="input" 
                value={aiTestPrompt} 
                onChange={(e) => setAiTestPrompt(e.target.value)} 
              />
            </label>
            
            <button 
              disabled={aiTesting} 
              type="button" 
              className="btn btn-primary" 
              onClick={testAiModel}
            >
              {aiTesting ? 'Executing Live LLM call...' : '🚀 Test LLM Prompt'}
            </button>

            {aiTestResponse && (
              <div className="rounded-xl border border-line bg-card p-4 space-y-2 max-h-48 overflow-y-auto">
                <div className="font-semibold text-slate-400 uppercase text-xs">LLM Response:</div>
                <div className="text-sm font-mono whitespace-pre-wrap">{aiTestResponse}</div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {/* System Diagnostics Checklist Panel */}
        <Panel title="System Readiness Diagnostics / سسٹم چیک لسٹ" action={
          <button disabled={loadingSetup} onClick={refreshSetupCheck} className="btn text-xs">
            {loadingSetup ? 'Checking...' : 'Refresh Checklist'}
          </button>
        }>
          <div className="grid gap-3">
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
              <span>Overall Readiness:</span>
              <StatusBadge tone={setupCheck?.ready ? 'good' : 'warn'}>
                {setupCheck?.score ?? 0}/{setupCheck?.total ?? 0} Ready
              </StatusBadge>
            </div>
            
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {setupCheck?.checks ? (
                setupCheck.checks.map((check, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between border-b border-line pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={check.ok ? 'text-emerald-500' : 'text-yellow-500'}>
                        {check.ok ? '✅' : '⚠️'}
                      </span>
                      <span className="font-semibold text-sm">{check.name}</span>
                      <span className="text-xs text-slate-400">({check.note})</span>
                    </div>
                    {check.fix && !check.ok && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-mono italic md:text-right mt-1 md:mt-0">
                        Fix: {check.fix}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">Loading checklist data...</div>
              )}
            </div>
          </div>
        </Panel>

        {/* Portability Panel */}
        <Panel title="Channel Config Portability / سیٹنگز درآمد اور برآمد">
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              WhatsApp channel target settings, source settings, presets, safety filters and rules block ko direct file main download ya upload karein.
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Export Configuration</span>
                <button type="button" className="btn btn-primary w-full text-xs" onClick={exportChannelConfig}>
                  ⬇️ Export Channel Config (.json)
                </button>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Import Configuration</span>
                <label className="btn text-xs w-full flex items-center justify-center cursor-pointer">
                  Upload & Import Settings File
                  <input type="file" accept=".json" className="hidden" onChange={importChannelConfig} />
                </label>
              </div>

              {importStatus && (
                <div className={`text-xs border p-3 rounded-lg font-mono ${importStatus.includes('Success') ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'border-line text-slate-400 bg-slate-950'}`}>
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
