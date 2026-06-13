export default function Panel({ title, children, action }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
