import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, Btn, Section } from "@/components/ui-kit";
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { dealerRates } from "@/lib/mock-reseller";

export const Route = createFileRoute("/_app/rates")({
  component: RatesPage,
});

function RatesPage() {
  const [rates, setRates] = useState(dealerRates);
  const [selected, setSelected] = useState<string>("ChatGPT");
  const [calc, setCalc] = useState({ buy: 1750, sell: 2600, qty: 10, margin: 30 });

  useEffect(() => {
    api.raw.get<any[]>("/api/dealer-intelligence/rates?limit=300").then((r) => {
      if (r?.length) setRates(r as any);
    });
  }, []);

  const best = useMemo(() => {
    const map = new Map<string, any>();
    rates.forEach((r) => {
      const key = `${r.tool}:${r.plan}`;
      const ex = map.get(key);
      if (!ex || r.buyPrice < ex.bestPrice) {
        map.set(key, { ...r, bestPrice: r.buyPrice });
      }
    });
    return [...map.values()].map((b) => {
      const grp = rates.filter((r) => r.tool === b.tool && r.plan === b.plan);
      const prices = grp.map((r) => r.buyPrice);
      return {
        ...b,
        avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length,
        highest: Math.max(...prices),
        margin: ((b.sellPrice - b.bestPrice) / b.bestPrice) * 100,
      };
    });
  }, [rates]);

  const compare = useMemo(() => rates.filter((r) => r.tool === selected).sort((a, b) => a.buyPrice - b.buyPrice), [rates, selected]);

  const history = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({ date: `D-${9 - i}`, price: Number(calc.buy) + (i % 4) * 35 - 70 })),
    [calc.buy]
  );

  const profit = Math.max(0, Number(calc.sell) - Number(calc.buy));
  const marginPct = Number(calc.buy) ? (profit / Number(calc.buy)) * 100 : 0;
  const minSell = Math.ceil(Number(calc.buy) * (1 + Number(calc.margin) / 100));

  return (
    <>
      <PageHeader title="Rates" subtitle="Live dealer rates aur profit intelligence." />

      <div className="grid xl:grid-cols-[1.4fr_.9fr] gap-4 mb-4">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-2 font-semibold">Live Dealer Rates</div>
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
                  <tr key={`${r.tool}-${r.plan}`} onClick={() => setSelected(r.tool)} className={`border-t border-border cursor-pointer hover:bg-accent/30 ${selected === r.tool ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2 font-semibold">{r.tool} <span className="text-muted-foreground font-normal">{r.plan}</span></td>
                    <td className="px-4 py-2 text-success">Rs {r.bestPrice.toLocaleString()}</td>
                    <td className="px-4 py-2">Rs {Math.round(r.avgPrice).toLocaleString()}</td>
                    <td className="px-4 py-2 text-destructive">Rs {r.highest.toLocaleString()}</td>
                    <td className="px-4 py-2"><Badge variant="info">{r.dealerCode}</Badge> {r.dealerName}</td>
                    <td className="px-4 py-2 text-success">{r.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Section title="Profit Calculator">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className="h-9 px-3 rounded-md bg-secondary border border-border text-sm" type="number" value={calc.buy} onChange={(e) => setCalc({ ...calc, buy: Number(e.target.value) })} placeholder="Buy" />
            <input className="h-9 px-3 rounded-md bg-secondary border border-border text-sm" type="number" value={calc.sell} onChange={(e) => setCalc({ ...calc, sell: Number(e.target.value) })} placeholder="Sell" />
            <input className="h-9 px-3 rounded-md bg-secondary border border-border text-sm" type="number" value={calc.qty} onChange={(e) => setCalc({ ...calc, qty: Number(e.target.value) })} placeholder="Qty" />
            <input className="h-9 px-3 rounded-md bg-secondary border border-border text-sm" type="number" value={calc.margin} onChange={(e) => setCalc({ ...calc, margin: Number(e.target.value) })} placeholder="Margin %" />
          </div>
          <div className="rounded-lg border border-border bg-muted p-4">
            <div className="text-xs text-muted-foreground">Profit per unit</div>
            <div className="text-2xl font-bold text-success">Rs {profit.toLocaleString()}</div>
            <div className="text-sm mt-2">Margin: <span className="font-semibold">{marginPct.toFixed(1)}%</span></div>
            <div className="text-sm">Total on {calc.qty} qty: <span className="font-semibold">Rs {(profit * calc.qty).toLocaleString()}</span></div>
            <div className="text-sm text-warning">Min viable sell: Rs {minSell.toLocaleString()}</div>
          </div>
        </Section>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <Section title={`Dealer Compare — ${selected}`}>
          <div className="space-y-2">
            {compare.map((r, i) => (
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
          </div>
        </Section>

        <Section title="30-Day Rate History">
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
        </Section>
      </div>
    </>
  );
}
