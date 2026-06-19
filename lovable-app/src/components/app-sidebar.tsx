import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, MessageCircle, Package, Bot, Users, ShoppingCart,
  Store, CreditCard, Crown, Inbox, Workflow, Send, Megaphone, Radio,
  Share2, Globe, Users2, Code2, BarChart3, Settings, Wifi, WifiOff,
  Facebook, Instagram, Linkedin, Music2, CalendarClock, ShieldCheck, ScrollText,
  Handshake, Tags, Boxes, TrendingUp, ShoppingBag, Zap, Gift,
  Sparkles, Plug, ListChecks, LogIn, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-hook";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/publisher", label: "✨ Composer", icon: Sparkles },
  { to: "/connections", label: "Connections", icon: Plug },
  { to: "/publisher-posts", label: "My Posts", icon: ListChecks },
  { to: "/publisher-analytics", label: "Publisher Stats", icon: BarChart3 },
  { to: "/dealers", label: "Dealers", icon: Handshake },
  { to: "/rates", label: "Rates", icon: Tags },
  { to: "/stock", label: "Stock", icon: Boxes },
  { to: "/sales", label: "Sales", icon: TrendingUp },
  { to: "/purchases", label: "Purchases", icon: ShoppingBag },
  { to: "/zero-touch", label: "Zero-Touch", icon: Zap },
  { to: "/giveaways", label: "Giveaways", icon: Gift },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/catalog", label: "Product Catalog", icon: Package },
  { to: "/marketplaces", label: "Marketplaces", icon: Store },
  { to: "/bots", label: "WA Bot / Conversations", icon: Bot },
  { to: "/customers", label: "Customers CRM", icon: Users },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/commerce", label: "Commerce", icon: Store },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/plans", label: "Plans", icon: Crown },
  { to: "/inbox", label: "AI Inbox Cockpit", icon: Inbox },
  { to: "/wati", label: "Wati Business Suite", icon: Crown },
  { to: "/flows", label: "Flow Builder", icon: Workflow },
  { to: "/smart-broadcast", label: "Smart Broadcast", icon: Send },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/broadcast", label: "Broadcast", icon: Radio },
  { to: "/channels", label: "Channel Automation", icon: Share2 },
  { to: "/social", label: "Social Hub", icon: Globe },
  { to: "/groups", label: "Groups", icon: Users2 },
  { to: "/code", label: "Code Intelligence", icon: Code2 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/scheduler", label: "Scheduler", icon: CalendarClock },
  { to: "/team", label: "Team & Roles", icon: ShieldCheck },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    api.getHealth().then((h) => {
      if (!alive) return;
      setConnected(h?.status === "ok" || h?.status === "connected");
    });
    return () => { alive = false; };
  }, []);

  return (
    <aside className="h-full w-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-black">
          S
        </div>
        <div>
          <div className="font-semibold leading-tight">SuperSender Pro</div>
          <div className="text-xs text-muted-foreground">AI Command Center</div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className={cn(
          "rounded-lg p-3 text-sm flex items-center gap-2",
          connected
            ? "bg-success/15 text-success"
            : connected === false
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground"
        )}>
          {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <div className="flex-1">
            <div className="font-medium">
              WhatsApp {connected ? "Connected" : connected === false ? "Disconnected" : "Checking…"}
            </div>
            <div className="text-[11px] opacity-80">
              {connected ? "Session active" : "Demo Mode"}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          {[
            { Icon: Music2, label: "TikTok" },
            { Icon: Instagram, label: "Instagram" },
            { Icon: Facebook, label: "Facebook" },
            { Icon: Linkedin, label: "LinkedIn" },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              title={label}
              className="h-8 w-8 grid place-items-center rounded-md bg-sidebar-accent hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-sidebar-accent text-sidebar-foreground/85"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <AuthFooter />
    </aside>
  );
}

function AuthFooter() {
  const { user, signOut } = useAuth();
  return (
    <div className="px-3 py-3 border-t border-sidebar-border">
      {user ? (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold uppercase">
            {(user.email ?? "U").slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate">{user.email}</div>
            <button onClick={() => signOut()} className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      ) : (
        <Link to="/auth" className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium justify-center">
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      )}
    </div>
  );
}
