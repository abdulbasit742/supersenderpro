import { useEffect, useRef, useState } from "react";
import { Bell, ShoppingCart, UserPlus, AlertTriangle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { id: 1, icon: ShoppingCart, color: "text-success", title: "New order #1042", body: "Ali Raza • PKR 3,200", time: "2m" },
  { id: 2, icon: UserPlus, color: "text-info", title: "New lead from WhatsApp", body: "+92 300 1234567", time: "8m" },
  { id: 3, icon: MessageSquare, color: "text-primary", title: "Bot reply sent", body: "Auto-response to laptop inquiry", time: "14m" },
  { id: 4, icon: AlertTriangle, color: "text-warning", title: "Low stock alert", body: "Dell XPS 13 — 2 left", time: "1h" },
];

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 grid place-items-center rounded-md bg-secondary hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-popover shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <div className="font-medium text-sm">Notifications</div>
            <button className="text-[11px] text-primary hover:underline">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {items.map((it) => (
              <div key={it.id} className="p-3 flex gap-3 hover:bg-accent cursor-pointer">
                <div className={cn("h-8 w-8 rounded-md bg-muted grid place-items-center shrink-0", it.color)}>
                  <it.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.body}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{it.time}</div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border text-center">
            <button className="text-xs text-primary hover:underline">View all activity</button>
          </div>
        </div>
      )}
    </div>
  );
}
