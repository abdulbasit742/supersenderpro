'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import { safeApi } from '../../lib/api';

const fallbackGiveaways = [
  {
    id: 'moclaw-deepseek-v4-free-30-days',
    provider: 'Moclaw AI',
    title: 'Moclaw AI - DeepSeek V4 Pro Free Trial',
    tool: 'DeepSeek V4 Pro',
    durationDays: 30,
    credits: 1000,
    link: 'https://moclaw.ai',
    publicImage: '/assets/giveaways/moclaw-deepseek-v4-free-trial.png',
    terms: ['DeepSeek V4 only', 'No card required', '1,000 credits included'],
    steps: ['Register with your email', 'Scroll down and click on Free Trial', 'Enjoy 30 days free']
  }
];

export default function GiveawaysPage() {
  const [giveaways, setGiveaways] = useState(fallbackGiveaways);

  useEffect(() => {
    safeApi('/api/business/giveaways', fallbackGiveaways).then((rows) => {
      if (Array.isArray(rows) && rows.length) setGiveaways(rows);
    });
  }, []);

  return (
    <AppShell title="Giveaways / Free Trials">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        {giveaways.map((item) => (
          <Panel key={item.id} title={item.title}>
            <div className="overflow-hidden rounded-xl border border-line bg-card">
              <img src={item.publicImage} alt={item.title} className="h-auto w-full object-cover" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="text-xs text-slate-400">Duration</div>
                <div className="text-2xl font-black text-emerald-300">{item.durationDays} days</div>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <div className="text-xs text-slate-400">Credits</div>
                <div className="text-2xl font-black text-sky-300">{Number(item.credits || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="text-xs text-slate-400">Card</div>
                <div className="text-2xl font-black text-purple-300">No card</div>
              </div>
            </div>
          </Panel>
        ))}

        <Panel title="Bot Message / WhatsApp Plan">
          {giveaways.map((item) => (
            <div key={item.id} className="space-y-4">
              <div className="rounded-xl border border-line bg-card p-4">
                <div className="text-sm text-slate-400">Customer trigger words</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['giveaway', 'free trial', 'moclaw', 'deepseek', '6'].map((word) => (
                    <span key={word} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">{word}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-card p-4">
                <div className="mb-2 font-bold">Claim steps</div>
                <ol className="space-y-2 text-sm text-slate-300">
                  {(item.steps || []).map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
                </ol>
                <a href={item.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg bg-mint px-4 py-2 text-sm font-bold text-black">
                  Open Moclaw
                </a>
              </div>
              <div className="rounded-xl border border-line bg-card p-4">
                <div className="mb-2 font-bold">Terms shown to user</div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(item.terms || []).map((term) => <li key={term}>- {term}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </AppShell>
  );
}
