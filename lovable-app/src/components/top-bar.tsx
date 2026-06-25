import { Search, Menu, Command, LogOut, Shield, User as UserIcon } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "./notifications";
import { useAuth } from "@/lib/auth-hook";
import { useHealth } from "@/lib/hooks";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { data: health, isLoading: healthLoading } = useHealth();
  const connected: boolean | null = healthLoading
    ? null
    : (health?.status === "ok" || health?.status === "connected" ? true : false);

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
      <div className="flex items-center gap-3 px-3 sm:px-6 h-14">
        <button
          onClick={onOpenMenu}
          className="lg:hidden h-9 w-9 grid place-items-center rounded-md bg-secondary hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex-1 max-w-xl relative text-left"
        >
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <div className="w-full pl-9 pr-16 h-9 flex items-center rounded-md bg-secondary border border-border text-sm text-muted-foreground">
            Search or jump to…
          </div>
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-muted rounded flex items-center gap-1">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        <NotificationsBell />

        <div className={cn(
          "hidden sm:flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-full",
          connected
            ? "bg-success/15 text-success"
            : connected === false
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground"
        )}>
          <span className={cn(
            "h-2 w-2 rounded-full",
            connected ? "bg-success animate-pulse" : connected === false ? "bg-destructive" : "bg-muted-foreground"
          )} />
          {connected ? "Connected" : connected === false ? "Disconnected" : "Checking"}
        </div>

        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;
  const label = (user.user_metadata?.display_name as string) || user.email || "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-md bg-secondary hover:bg-accent text-sm"
      >
        <span className="h-7 w-7 grid place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initial}
        </span>
        {isAdmin && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
            <Shield className="h-3 w-3" /> ADMIN
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-popover border border-border rounded-md shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium truncate">
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{label}</span>
            </div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <div className="mt-1.5 text-[10px] font-semibold text-muted-foreground">
              Role: <span className={isAdmin ? "text-primary" : ""}>{isAdmin ? "Admin" : "User"}</span>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

