export default function StatusBadge({ tone = 'neutral', children }) {
  const tones = {
    good: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    warn: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
    bad: 'bg-red-500/20 text-red-700 dark:text-red-300',
    info: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
    neutral: 'bg-slate-500/20 text-slate-700 dark:text-slate-300'
  };
  return <span className={`badge ${tones[tone] || tones.neutral}`}>{children}</span>;
}
