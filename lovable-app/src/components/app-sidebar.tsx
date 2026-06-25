import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, MessageCircle, Package, Bot, Users, ShoppingCart,
  Store, CreditCard, Crown, Inbox, Workflow, Send, Megaphone, Radio,
  Share2, Globe, Users2, Code2, BarChart3, Settings, Wifi, WifiOff,
  Facebook, Instagram, Linkedin, Music2, CalendarClock, ShieldCheck, ScrollText,
  Handshake, Tags, Boxes, TrendingUp, ShoppingBag, Zap, Gift,
  Sparkles, Plug, ListChecks, LogIn, LogOut, ChevronDown,
  Brain, Star, Scan, FileText, Building2,
  Webhook, GitBranch, Eye, QrCode, Phone, Table2, BarChart2,
  Cake, Smartphone, Target, Link2, CalendarRange, PackageOpen, Languages, MessageSquare,
  Key, UserPlus, FlaskConical, Filter, DollarSign, TicketIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-hook";
import { useState } from "react";
import { useHealth } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// ─── Nav definition grouped by domain ────────────────────────────────────────

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV_GROUPS: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "Overview",
    items: [
      { to: "/",         label: "Dashboard",  icon: LayoutDashboard },
      { to: "/analytics",label: "Analytics",  icon: BarChart3 },
      { to: "/audit",    label: "Audit Log",  icon: ScrollText },
    ],
  },
  {
    group: "Publisher",
    items: [
      { to: "/publisher",           label: "Composer",         icon: Sparkles },
      { to: "/connections",         label: "Connections",      icon: Plug },
      { to: "/publisher-posts",     label: "My Posts",         icon: ListChecks },
      { to: "/publisher-analytics", label: "Publisher Stats",  icon: BarChart3 },
      { to: "/social",              label: "Social Hub",       icon: Globe },
      { to: "/scheduler",           label: "Scheduler",        icon: CalendarClock },
    ],
  },
  {
    group: "Reseller",
    items: [
      { to: "/dealers",   label: "Dealers",    icon: Handshake },
      { to: "/rates",     label: "Rates",      icon: Tags },
      { to: "/stock",     label: "Stock",      icon: Boxes },
      { to: "/sales",     label: "Sales",      icon: TrendingUp },
      { to: "/purchases", label: "Purchases",  icon: ShoppingBag },
      { to: "/zero-touch",label: "Zero-Touch", icon: Zap },
      { to: "/giveaways", label: "Giveaways",  icon: Gift },
    ],
  },
  {
    group: "CRM & Orders",
    items: [
      { to: "/customers", label: "Customers",      icon: Users },
      { to: "/orders",    label: "Orders",          icon: ShoppingCart },
      { to: "/payments",  label: "Payments",        icon: CreditCard },
      { to: "/plans",     label: "Plans",           icon: Crown },
      { to: "/catalog",   label: "Product Catalog", icon: Package },
      { to: "/commerce",  label: "Commerce",        icon: Store },
      { to: "/marketplaces", label: "Marketplaces", icon: Store },
    ],
  },
  {
    group: "WhatsApp",
    items: [
      { to: "/sales-bot",      label: "AI Sales Bot",       icon: Sparkles },
      { to: "/whatsapp",       label: "WhatsApp",           icon: MessageCircle },
      { to: "/bots",           label: "Bot / Convos",       icon: Bot },
      { to: "/inbox",          label: "AI Inbox Cockpit",   icon: Inbox },
      { to: "/team-inbox",     label: "Team Inbox & SLA",   icon: Users2 },
      { to: "/wati",           label: "Wati Suite",         icon: Crown },
      { to: "/groups",         label: "Groups",             icon: Users2 },
      { to: "/channels",       label: "Channel Automation", icon: Share2 },
    ],
  },
  {
    group: "Meta Business API",
    items: [
      { to: "/meta-business",  label: "Meta WA Business",  icon: Building2 },
      { to: "/wa-templates",   label: "Message Templates",  icon: FileText },
      { to: "/wa-catalog",     label: "Catalog & Flows",   icon: Package },
    ],
  },
  {
    group: "Revenue Engine",
    items: [
      { to: "/renewals",           label: "Renewal Engine",     icon: CalendarClock },
      { to: "/smart-broadcast",    label: "Smart Broadcast",    icon: Send },
      { to: "/upsell",             label: "Upsell Engine",      icon: TrendingUp },
      { to: "/customer-intelligence", label: "AI Intelligence", icon: Brain },
      { to: "/loyalty",            label: "Loyalty & Referral", icon: Star },
      { to: "/order-extractor",    label: "AI Order Extractor", icon: Scan },
      { to: "/pricing-engine",     label: "Dynamic Pricing",    icon: Tags },
      { to: "/forecast",           label: "Revenue Forecast",   icon: BarChart3 },
      { to: "/payment-automation", label: "Payment Automation", icon: CreditCard },
      { to: "/invoice",            label: "Invoice Generator",  icon: FileText },
      { to: "/bulk-orders",        label: "Bulk Order Import",  icon: Table2 },
    ],
  },
  {
    group: "Automation & AI",
    items: [
      { to: "/lifecycle-journey",    label: "Lifecycle Journeys",  icon: GitBranch },
      { to: "/webhooks",             label: "Webhooks & Zapier",   icon: Webhook },
      { to: "/product-ai",           label: "AI Content Writer",   icon: Sparkles },
      { to: "/delivery-automation",  label: "Digital Delivery",    icon: Key },
      { to: "/birthday-campaign",    label: "Birthday Campaign",   icon: Cake },
      { to: "/ab-testing",           label: "A/B Broadcast Test",  icon: FlaskConical },
      { to: "/segments",             label: "Smart Segments",      icon: Filter },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { to: "/dealer-monitor",     label: "Dealer Monitor",     icon: Eye },
      { to: "/ads-tracker",        label: "Ads ROI Tracker",    icon: BarChart2 },
      { to: "/pnl",                label: "P&L Report",         icon: DollarSign },
      { to: "/sales-targets",      label: "Sales Targets",      icon: Target },
      { to: "/inventory-aging",    label: "Inventory Aging",    icon: PackageOpen },
    ],
  },
  {
    group: "Tools",
    items: [
      { to: "/qr-studio",             label: "QR Code Studio",      icon: QrCode },
      { to: "/wa-validator",          label: "WA Validator",        icon: Phone },
      { to: "/stock-reorder",         label: "Stock & Reorder",     icon: Boxes },
      { to: "/reviews",               label: "Customer Reviews",    icon: Star },
      { to: "/multi-wa",              label: "Multi-WA Accounts",   icon: Smartphone },
      { to: "/subscription-calendar", label: "Sub Calendar",        icon: CalendarRange },
      { to: "/urdu-toggle",           label: "Urdu UI Toggle",      icon: Languages },
      { to: "/sms-fallback",          label: "SMS Fallback",        icon: MessageSquare },
    ],
  },
  {
    group: "Partners",
    items: [
      { to: "/sub-reseller",    label: "Sub-Resellers",       icon: UserPlus },
      { to: "/affiliate",       label: "Affiliate Program",   icon: Link2 },
      { to: "/support-tickets", label: "Support Tickets",     icon: TicketIcon },
    ],
  },
  {
    group: "Campaigns",
    items: [
      { to: "/campaigns",       label: "Campaigns",        icon: Megaphone },
      { to: "/broadcast",       label: "Broadcast",        icon: Radio },
      { to: "/flows",           label: "Flow Builder",     icon: Workflow },
    ],
  },
  {
    group: "Admin",
    items: [
      { to: "/team",     label: "Team & Roles",     icon: ShieldCheck },
      { to: "/code",     label: "Code Intelligence",icon: Code2 },
      { to: "/settings", label: "Settings",         icon: Settings },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: health, isLoading: healthLoading } = useHealth();
  const connected: boolean | null = healthLoading
    ? null
    : (health?.status === "ok" || health?.status === "connected" ? true : false);

  const defaultOpen = NAV_GROUPS.reduce<Record<string, boolean>>((acc, g) => {
    const isActive = g.items.some(
      (it) => pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to))
    );
    acc[g.group] = isActive || g.group === "Overview" || g.group === "Reseller";
    return acc;
  }, {});

  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpen);
  const toggle = (g: string) => setOpen((p) => ({ ...p, [g]: !p[g] }));

  return (
    <aside className="h-full w-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden">
      {/* ── Logo ── */}
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-black text-lg">
          S
        </div>
        <div>
          <div className="font-semibold leading-tight">SuperSender Pro</div>
          <div className="text-[11px] text-muted-foreground">AI Command Center</div>
        </div>
      </div>

      {/* ── WhatsApp status + social ── */}
      <div className="px-4 py-3 border-b border-sidebar-border shrink-0">
        <div className={cn(
          "rounded-lg p-2.5 text-sm flex items-center gap-2",
          connected
            ? "bg-success/15 text-success"
            : connected === false
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground"
        )}>
          {connected ? <Wifi className="h-4 w-4 shrink-0" /> : <WifiOff className="h-4 w-4 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs">
              WA {connected ? "Connected" : connected === false ? "Offline" : "Checking…"}
            </div>
            <div className="text-[10px] opacity-70">
              {connected ? "Session active" : "Demo Mode"}
            </div>
          </div>
          <span className={cn(
            "h-2 w-2 rounded-full shrink-0",
            connected ? "bg-success animate-pulse" : "bg-muted-foreground"
          )} />
        </div>

        <div className="mt-2.5 flex items-center justify-around">
          {[
            { Icon: Music2,     label: "TikTok" },
            { Icon: Instagram,  label: "Instagram" },
            { Icon: Facebook,   label: "Facebook" },
            { Icon: Linkedin,   label: "LinkedIn" },
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

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map(({ group, items }) => (
          <div key={group} className="mb-1">
            <button
              onClick={() => toggle(group)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              {group}
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform",
                open[group] ? "rotate-0" : "-rotate-90"
              )} />
            </button>

            {open[group] && (
              <div className="mt-0.5 space-y-0.5">
                {items.map(({ to, label, icon: Icon }) => {
                  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
                  return (
                    <Link
                      key={to}
                      to={to as never}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-sidebar-accent text-sidebar-foreground/85 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <AuthFooter />
    </aside>
  );
}

function AuthFooter() {
  const { user, signOut } = useAuth();
  return (
    <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
      {user ? (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold uppercase shrink-0">
            {(user.email ?? "U").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate">{user.email}</div>
            <button
              onClick={() => signOut()}
              className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1 mt-0.5"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/auth"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium justify-center"
        >
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      )}
    </div>
  );
}
