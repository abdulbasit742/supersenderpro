import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Section, Skeleton } from "@/components/ui-kit";
import { useMemo, useState } from "react";
import { LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLiveRates } from "@/lib/hooks";
import type { LiveRate } from "@/lib/types";

export const Route = createFileRoute("/_app/rates")({
  component: RatesPage,
});

function RatesPage() {
  const { data: rates = [], isLoading } = useLiveRates();
  const [selected, setSelected] = useState<string>("ChatGPT");
  const [calc, setCalc] = useState({ buy: 1750, sell: 2600, qty: 10, margin: 30 });

  const best = useMemo(() => {
    const map = new Map<string, LiveRate & { bestPrice: number; avgPrice: number; highest: number; margin: number }>();
    rates.forEach((r: LiveRate) => {
      const key = `${r.tool}:${r.plan}`;
      const ex = map.get(key);
      if (!ex || r.buyPrice < ex.bestPrice) map.set(key, { ...r, bestPrice: r.buyPrice, avgPrice: 0, highest: 0, margin: 0 });
    });
    return [...map.values()].map((b) => {
      const grp    = rates.filter((r: LiveRate) => r.tool === b.tool && r.plan === b.plan);
      const prices = grp.map((r: LiveRate) => r.buyPrice);
      return {
        ...b,
        avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length,
        highest:  Math.max(...prices),
        margin:   ((b.sellPrice - b.bestPrice) / b.bestPrice) * 100,
      };
    });
  }, [rates]);

  const compare = useMemo(
    () => rates.filter((r: LiveRate) => r.tool === selected).sort((a: LiveRate, b: LiveRate) => a.buyPrice - b.buyPrice),
    [rates, selected]
  );

  const history = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({ date: `D-${9 - i}`, price: Number(calc.buy) + (i % 4) * 35 - 70 })),
    [calc.buy]
  );

  const profit    = Math.max(0, Number(calc.sell) - Number(calc.buy));
  const marginPct = Number(calc.buy) ? (profit / Number(calc.buy)) * 100 : 0;
  const minSell   = Math.ceil(Number(calc.buy) * (1 + Number(calc.margin) / 100));

  return (
    <>
      <PageHeader title="Rates" subtitle="Live dealer rates aur profit intelligence." />

      <div className="grid xl:grid-cols-[1.4fr_.9fr] gap-4 mb-4">
        {/* ── Live rates table ── */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-2 font-semibold">Live Dealer Rates</div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {["Tool", "Lowest", "Avg", "Highest", "Best Dealer", "Margin"].map((h) => (
                      <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {best.map((r) => (
                    <tr
                      key={`${r.tool}-${r.plan}`}
                      onClick={() => setSelected(r.tool)}
                      className={`border-t border-border cursor-pointer hover:bg-accent/30 transition-colors ${selected === r.tool ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-4 py-2 font-semibold">{r.tool} <span className="text-muted-foreground font-normal text-xs">{r.plan}</span></td>
                      <td className="px-4 py-2 text-success font-medium">Rs {r.bestPrice.toLocaleString()}</td>
                      <td className="px-4 py-2">Rs {Math.round(r.avgPrice).toLocaleString()}</td>
                      <td className="px-4 py-2 text-destructive">Rs {r.highest.toLocaleString()}</td>
                      <td className="px-4 py-2"><Badge variant="info">{r.dealerCode}</Badge> {r.dealerName}</td>
                      <td className="px-4 py-2 text-success">{r.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Profit calculator ── */}
        <Section title="Profit Calculator">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { key: "buy",    label: "Buy Price" },
              { key: "sell",   label: "Sell Price" },
              { key: "qty",    label: "Quantity" },
              { key: "margin", label: "Min Margin %" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input
                  type="number"
                  value={calc[key as keyof typeof calc]}
                  onChange={(e) => setCalc((c) => ({ ...c, [key]: Number(e.target.value) }))}
                  className="h-9 w-full px-3 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-muted p-4 space-y-1.5">
            <div className="text-xs text-muted-foreground">Profit per unit</div>
            <div className="text-2xl font-bold text-success">Rs {profit.toLocaleString()}</div>
            <div className="text-sm">Margin: <span className="font-semibold">{marginPct.toFixed(1)}%</span></div>
            <div className="text-sm">Total on {calc.qty} qty: <span className="font-semibold">Rs {(profit * calc.qty).toLocaleString()}</span></div>
            <div className="text-sm text-warning">Min viable sell: Rs {minSell.toLocaleString()}</div>
          </div>
        </Section>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        {/* ── Dealer compare ── */}
        <Section title={`Dealer Compare — ${selected}`}>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : (
            <div className="space-y-2">
              {compare.map((r: LiveRate, i: number) => (
                <div key={r.id} className="rounded-lg border border-border bg-muted p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{i + 1}. {r.dealerName}</div>
                    <div className="text-[11px] text-muted-foreground">{r.plan} • {new Date(r.parsedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-success">Rs {r.buyPrice.toLocaleString()}</div>
                    <Badge variant={r.trust === "trusted" ? "success" : "warning"}>{r.dealerCode}</Badge>
                  </div>
                </div>
              ))}
              {compare.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No rates for {selected}</p>}
            </div>
          )}
        </Section>

        {/* ── Rate history chart ── */}
        <Section title="30-Day Rate History">
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={history}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="price" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
