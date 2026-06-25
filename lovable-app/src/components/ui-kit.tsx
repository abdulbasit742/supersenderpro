import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ─── Layout / Typography ──────────────────────────────────────────────────────

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  className, children,
}: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("card-elevated rounded-xl p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}

export function Section({
  title, children, actions,
}: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </Card>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info" | "muted";

const BADGE_MAP: Record<BadgeVariant, string> = {
  default:     "bg-primary/15 text-primary",
  success:     "bg-success/15 text-success",
  warning:     "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  info:        "bg-info/15 text-info",
  muted:       "bg-muted text-muted-foreground",
};

export function Badge({
  variant = "default", children,
}: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
      BADGE_MAP[variant]
    )}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

type BtnVariant = "default" | "primary" | "ghost" | "destructive" | "outline";

const BTN_MAP: Record<BtnVariant, string> = {
  default:     "bg-secondary hover:bg-accent text-secondary-foreground",
  primary:     "bg-primary text-primary-foreground hover:opacity-90",
  ghost:       "hover:bg-accent text-foreground",
  destructive: "bg-destructive/90 text-destructive-foreground hover:bg-destructive",
  outline:     "border border-border hover:bg-accent text-foreground",
};

export function Btn({
  variant = "default", className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 h-9 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        BTN_MAP[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiAccent = "primary" | "success" | "warning" | "info" | "destructive";

const KPI_MAP: Record<KpiAccent, string> = {
  primary:     "bg-primary/15 text-primary",
  success:     "bg-success/15 text-success",
  warning:     "bg-warning/15 text-warning",
  info:        "bg-info/15 text-info",
  destructive: "bg-destructive/15 text-destructive",
};

export function KpiCard({
  label, value, hint, icon: Icon, accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: KpiAccent;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={cn("h-12 w-12 grid place-items-center rounded-lg shrink-0", KPI_MAP[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold leading-tight truncate">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </Card>
  );
}

// ─── Form Controls ────────────────────────────────────────────────────────────

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-9 w-full rounded-md bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-md bg-secondary border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-9 w-full rounded-md bg-secondary border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
        props.className
      )}
    />
  );
}

export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )} />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("flex items-center gap-4", className)}>
      <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </Card>
  );
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-t border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function LoadingTable({
  cols = 5, rows = 6, headers,
}: { cols?: number; rows?: number; headers?: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {(headers ?? Array.from({ length: cols }, (_, i) => `Col ${i + 1}`)).map((h) => (
              <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={headers?.length ?? cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

export function StatusDot({ status }: { status: "online" | "offline" | "pending" }) {
  return (
    <span className={cn(
      "inline-block h-2 w-2 rounded-full",
      status === "online"  ? "bg-success animate-pulse" :
      status === "offline" ? "bg-destructive" : "bg-warning"
    )} />
  );
}
