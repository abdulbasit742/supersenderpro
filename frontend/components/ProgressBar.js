export default function ProgressBar({ value = 0, max = 100, tone = 'good' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (Number(value || 0) / Number(max || 1)) * 100)) : 0;
  const colors = {
    good: 'bg-emerald-400',
    warn: 'bg-yellow-400',
    bad: 'bg-red-400',
    info: 'bg-sky-400'
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-300/70 dark:bg-slate-700/40">
      <div className={`h-full rounded-full ${colors[tone] || colors.good}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
