import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, KpiCard, Badge, Section } from "@/components/ui-kit";
import {
  Users, DollarSign, ShoppingCart, Handshake, AlertTriangle, Clock, TrendingUp, Wifi,
  Plus, Package, Megaphone, UserPlus, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  businessOverview, profitSeries, recentOrders, stockInventoryData, pendingTrustData,
} from "@/lib/mock-reseller";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const [summary, setSummary] = useState(businessOverview);
  const [profit, setProfit] = useState(profitSeries);
  const [orders, setOrders] = useState(recentOrders);
  const [stock, setStock] = useState(stockInventoryData);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.raw.get<any>("/api/business/overview"),
      api.raw.get<any>("/api/analytics/profit?days=7"),
      api.raw.get<any[]>("/api/business/orders?limit=8"),
      api.raw.get<any[]>("/api/business/stock-inventory"),
    ]).then(([o, p, ord, st]) => {
      if (!alive) return;
      if (o) setSummary({ ...businessOverview, ...o });
      if (p) setProfit({ ...profitSeries, ...p });
      if (ord?.length) setOrders(ord as any);
      if (st?.length) setStock(st as any);
    });
    return () => { alive = false; };
  }, []);

  const lowStock = stock
    .filter((s) => Number(s.available ?? 0) <= Number(s.threshold ?? 3))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="AI tools reseller command center — rates, stock, orders aur profit."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
        {[
          { to: "/orders", label: "New Order", icon: Plus, accent: "bg-primary text-primary-foreground" },
          { to: "/stock", label: "Add Stock", icon: Package, accent: "bg-secondary" },
          { to: "/broadcast", label: "Broadcast", icon: Megaphone, accent: "bg-secondary" },
          { to: "/dealers", label: "New Dealer", icon: UserPlus, accent: "bg-secondary" },
          { to: "/zero-touch", label: "Zero-Touch", icon: Zap, accent: "bg-secondary" },
        ].map((a) => (
          <Link key={a.to} to={a.to as any}
            className={`flex items-center gap-2 px-3 h-11 rounded-lg text-sm font-medium hover:opacity-90 transition ${a.accent}`}>
            <a.icon className="h-4 w-4" /> {a.label}
          </Link>
        ))}
      </div>


      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Today Revenue" value={`Rs ${(summary.todayRevenue ?? 0).toLocaleString()}`} icon={DollarSign} accent="success" />
        <KpiCard label="Today Profit" value={`Rs ${(summary.todayProfit ?? 0).toLocaleString()}`} icon={TrendingUp} accent="success" />
        <KpiCard label="Orders Today" value={summary.todayOrders ?? 0} hint={`${summary.pendingOrders ?? 0} pending`} icon={ShoppingCart} accent="info" />
        <KpiCard label="Trusted Dealers" value={summary.trustedDealers ?? 0} hint={`${summary.pendingTrust ?? 0} pending trust`} icon={Handshake} accent="primary" />
        <KpiCard label="Avg Margin" value={`${(summary.avgMargin ?? 0).toFixed(1)}%`} icon={Users} accent="warning" />
        <KpiCard label="WhatsApp" value="Online" icon={Wifi} accent="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Section title="Weekly Profit Trend">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={profit.daily || []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area dataKey="profit" stroke="var(--color-primary)" fill="url(#dp)" strokeWidth={2} />
                <Area dataKey="revenue" stroke="var(--color-info)" fill="transparent" strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Top Tools by Sales">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={profit.topTools || []}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="tool" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="quantity" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Alerts">
          <div className="space-y-2">
            {(summary.alerts || []).slice(0, 5).map((a: any) => (
              <div key={a.id || a.title} className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${a.severity === "warning" ? "text-warning" : "text-info"}`} />
                <div className="text-sm">{a.title || a.message}</div>
              </div>
            ))}
            {pendingTrustData.slice(0, 2).map((p) => (
              <div key={p.id} className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning">
                <Clock className="h-4 w-4 mt-0.5" />
                <div className="text-sm">Trust vote pending: <span className="font-semibold">{p.dealerName}</span></div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-2 font-semibold">Recent Orders</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {["Order", "Customer", "Tool", "Qty", "Sell", "Profit", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((o: any) => (
                  <tr key={o.id || o.orderId} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{o.orderId}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{o.customerName || o.customer?.name}</div>
                      <div className="text-[11px] text-muted-foreground">{o.whatsapp || o.customer?.whatsapp}</div>
                    </td>
                    <td className="px-4 py-2">{o.tool} {o.plan}</td>
                    <td className="px-4 py-2">{o.qty ?? o.quantity ?? 1}</td>
                    <td className="px-4 py-2">Rs {Number(o.sellPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-success">Rs {Number(o.profit || 0).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <Badge variant={o.status === "delivered" ? "success" : o.status === "awaiting_payment" ? "warning" : "info"}>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Section title="Low Stock Alerts">
          <div className="space-y-3">
            {lowStock.map((row: any) => {
              const qty = Number(row.available ?? 0);
              const max = Number(row.total ?? row.threshold ?? 3);
              const pct = Math.min(100, (qty / Math.max(1, max)) * 100);
              return (
                <div key={row.id} className={`rounded-lg border p-3 ${qty === 0 ? "border-destructive/40 bg-destructive/10" : "border-warning/40 bg-warning/10"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{row.tool} {row.plan} <span className="text-muted-foreground">({row.accountType})</span></div>
                    <Badge variant={qty === 0 ? "destructive" : "warning"}>{qty === 0 ? "Out" : "Low"}</Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${qty === 0 ? "bg-destructive" : "bg-warning"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Qty {qty}/{max} • Dealer {row.dealerCode || "—"}</div>
                </div>
              );
            })}
            {lowStock.length === 0 && (
              <div className="text-sm text-muted-foreground">All stock healthy ✓</div>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}
