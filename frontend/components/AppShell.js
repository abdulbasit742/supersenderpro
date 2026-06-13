'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import useRealtime from '../lib/useRealtime';

const nav = [
  ['Dashboard', '/dashboard'],
  ['Giveaways', '/giveaways'],
  ['Rates', '/rates'],
  ['Dealers', '/dealers'],
  ['Stock', '/stock'],
  ['Orders', '/orders'],
  ['Customers', '/customers'],
  ['Purchases', '/purchases'],
  ['Sales', '/sales'],
  ['Broadcast', '/broadcast'],
  ['Social', '/social'],
  ['Analytics', '/analytics'],
  ['Zero-Touch', '/zero-touch'],
  ['Settings', '/settings']
];

export default function AppShell({ title, children }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const { status, lastEvent } = useRealtime([
    'business:order',
    'business:stock',
    'dealer:rates',
    'price:intelligence',
    'sheets:sync',
    'zero-touch:job'
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-ink text-slate-900 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel p-4 lg:block">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-sm font-black text-black">AI</div>
          <div>
            <div className="font-bold">AI Tools OS</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Reseller Command Center</div>
          </div>
        </div>
        <nav className="space-y-1">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === href ? 'bg-emerald-500/15 text-mint' : 'text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-panel/95 px-4 py-4 backdrop-blur lg:px-8">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI subscriptions reseller dashboard with rates, CRM, stock, analytics and group broadcasts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden rounded-full px-3 py-2 text-xs font-bold md:block ${status === 'live' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/15 text-red-700 dark:text-red-300'}`}>
              {status === 'live' ? 'Live sync' : 'Offline cache'}
            </div>
            <button className="btn" onClick={() => setDark(!dark)}>
              {dark ? 'Dark' : 'Light'}
            </button>
            <a href="http://127.0.0.1:3001" className="btn">
              SuperSender
            </a>
          </div>
        </header>

        <div className="border-b border-line bg-panel px-4 py-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                  pathname === href ? 'bg-emerald-500/15 text-mint' : 'bg-card text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4 lg:p-8">
          {lastEvent ? (
            <div className="mb-4 rounded-lg border border-mint/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-200">
              Real-time update: <span className="font-semibold">{lastEvent.event}</span> at {new Date(lastEvent.at).toLocaleTimeString()}
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
