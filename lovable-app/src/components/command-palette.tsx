import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ArrowRight } from "lucide-react";

const items: { label: string; to: string; group: string }[] = [
  { label: "Dashboard", to: "/", group: "Pages" },
  { label: "WhatsApp", to: "/whatsapp", group: "Pages" },
  { label: "Customers CRM", to: "/customers", group: "Pages" },
  { label: "Orders", to: "/orders", group: "Pages" },
  { label: "Plans", to: "/plans", group: "Pages" },
  { label: "Channel Automation", to: "/channels", group: "Pages" },
  { label: "Social Hub", to: "/social", group: "Pages" },
  { label: "Analytics", to: "/analytics", group: "Pages" },
  { label: "Scheduler", to: "/scheduler", group: "Pages" },
  { label: "Team & Roles", to: "/team", group: "Pages" },
  { label: "Audit Log", to: "/audit", group: "Pages" },
  { label: "Settings", to: "/settings", group: "Pages" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!open) return null;
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a page or action…"
            className="flex-1 h-12 bg-transparent outline-none text-sm"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 bg-muted rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No matches</div>
          )}
          {filtered.map((it) => (
            <button
              key={it.to}
              onClick={() => { setOpen(false); navigate({ to: it.to }); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent text-sm"
            >
              <span>{it.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground flex justify-between">
          <span>Quick nav</span>
          <span>⌘K / Ctrl+K to toggle</span>
        </div>
      </div>
    </div>
  );
}
