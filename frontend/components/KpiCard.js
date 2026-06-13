export default function KpiCard({ label, value, tone = 'normal', hint }) {
  const toneClass =
    tone === 'good'
      ? 'text-mint'
      : tone === 'warn'
        ? 'text-yellow-700 dark:text-yellow-300'
        : tone === 'bad'
          ? 'text-red-700 dark:text-red-300'
          : 'text-slate-950 dark:text-white';
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-3 text-2xl font-black ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}
