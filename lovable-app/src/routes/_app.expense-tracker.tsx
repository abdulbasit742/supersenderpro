import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Receipt, Plus, Trash2, TrendingDown, DollarSign } from "lucide-react";
import type { Expense, ExpenseCategory } from "@/lib/expense-tracker.functions";

export const Route = createFileRoute("/_app/expense-tracker")({
  component: ExpenseTrackerPage,
});

type Tab = "overview" | "list" | "add";

function makeExp(i: number): Expense {
  const cats: ExpenseCategory[] = ["inventory","marketing","tools","salary","office","shipping","tax","other"];
  const titles = ["Product procurement","Facebook Ads","Canva Pro subscription","Team salary","Office rent","Courier charges","Monthly tax filing","Miscellaneous"];
  const amounts = [45000, 8000, 1800, 25000, 15000, 3200, 6500, 2000];
  const d = new Date(); d.setDate(d.getDate() - i * 3);
  return { id: `ex${i}`, title: titles[i % titles.length], category: cats[i % cats.length], amount: amounts[i % amounts.length], date: d.toISOString().split("T")[0], notes: i % 3 === 0 ? "Recurring monthly expense" : undefined, isRecurring: i % 4 === 0, recurringInterval: i % 4 === 0 ? "monthly" : undefined };
}
const MOCK_EXPENSES: Expense[] = Array.from({ length: 12 }, (_, i) => makeExp(i));
const CAT_COLORS: Record<ExpenseCategory, string> = { inventory: "bg-blue-100 text-blue-700", marketing: "bg-purple-100 text-purple-700", tools: "bg-cyan-100 text-cyan-700", salary: "bg-orange-100 text-orange-700", office: "bg-yellow-100 text-yellow-700", shipping: "bg-teal-100 text-teal-700", tax: "bg-red-100 text-red-700", other: "bg-gray-100 text-gray-600" };
const CATEGORIES: ExpenseCategory[] = ["inventory","marketing","tools","salary","office","shipping","tax","other"];

export default function ExpenseTrackerPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [newExp, setNewExp] = useState({ title: "", category: "inventory" as ExpenseCategory, amount: 0, date: new Date().toISOString().split("T")[0], notes: "", isRecurring: false });
  const qc = useQueryClient();

  const { data: expenses = MOCK_EXPENSES } = useQuery({ queryKey: ["expenses"], queryFn: async () => { const { getExpenses } = await import("@/lib/expense-tracker.functions"); return getExpenses({ data: {} }); }, placeholderData: MOCK_EXPENSES, staleTime: 60_000 });

  const addMut = useMutation({ mutationFn: async () => { const { addExpense } = await import("@/lib/expense-tracker.functions"); return addExpense({ data: { ...newExp, amount: Number(newExp.amount) } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setNewExp({ title: "", category: "inventory", amount: 0, date: new Date().toISOString().split("T")[0], notes: "", isRecurring: false }); setTab("list"); } });

  const totalMonth = (expenses as typeof MOCK_EXPENSES).reduce((s, e) => s + e.amount, 0);
  const grossRevenue = 485000;
  const netProfit = grossRevenue - totalMonth;
  const margin = Math.round((netProfit / grossRevenue) * 100);

  const byCat = {} as Record<string, number>;
  (expenses as typeof MOCK_EXPENSES).forEach(e => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount; });
  const catEntries = Object.entries(byCat).sort(([,a],[,b]) => b - a);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> Expense Tracker</h1>
          <p className="text-muted-foreground text-sm">Track business expenses vs revenue — know your real profit margin</p>
        </div>
        <button onClick={() => setTab("add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Add Expense</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-red-700">PKR {(totalMonth/1000).toFixed(0)}K</div><div className="text-xs text-red-600">Total Expenses</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-blue-700">PKR {(grossRevenue/1000).toFixed(0)}K</div><div className="text-xs text-blue-600">Gross Revenue</div></div>
        <div className={`border rounded-xl p-3 text-center ${netProfit > 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}><div className={`text-xl font-bold ${netProfit > 0 ? "text-green-700" : "text-red-700"}`}>PKR {(netProfit/1000).toFixed(0)}K</div><div className={`text-xs ${netProfit > 0 ? "text-green-600" : "text-red-600"}`}>Net Profit</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className={`text-2xl font-bold ${margin > 30 ? "text-green-600" : margin > 15 ? "text-yellow-600" : "text-red-600"}`}>{margin}%</div><div className="text-xs text-muted-foreground">Profit Margin</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["overview","list","add"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "add" ? "Add Expense" : t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Expenses by Category</h3>
            <div className="space-y-2">
              {catEntries.map(([cat, amount]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1"><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${CAT_COLORS[cat as ExpenseCategory]}`}>{cat}</span></div><span className="font-medium">PKR {amount.toLocaleString()} ({Math.round((amount/totalMonth)*100)}%)</span></div>
                  <div className="h-2 bg-muted rounded-full"><div className="h-2 bg-primary rounded-full" style={{ width: `${(amount / totalMonth) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Profit vs Expenses</h3>
            <div className="h-6 bg-muted rounded-full flex overflow-hidden">
              <div className="bg-green-400 h-6 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${margin}%` }}>Profit {margin}%</div>
              <div className="bg-red-400 h-6 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${100-margin}%` }}>Expense {100-margin}%</div>
            </div>
          </div>
        </div>
      )}

      {tab === "list" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Title","Category","Amount","Date","Notes"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(expenses as typeof MOCK_EXPENSES).map(e => (
                <tr key={e.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{e.title}{e.isRecurring && <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 rounded">recurring</span>}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${CAT_COLORS[e.category]}`}>{e.category}</span></td>
                  <td className="px-4 py-3 font-medium text-red-600">PKR {e.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{e.date}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "add" && (
        <div className="max-w-md space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Title</label><input value={newExp.title} onChange={e => setNewExp(p => ({ ...p, title: e.target.value }))} placeholder="Facebook Ads — June" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground block mb-1">Category</label><select value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value as ExpenseCategory }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Amount (PKR)</label><input type="number" value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">Date</label><input type="date" value={newExp.date} onChange={e => setNewExp(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label><input value={newExp.notes} onChange={e => setNewExp(p => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newExp.isRecurring} onChange={e => setNewExp(p => ({ ...p, isRecurring: e.target.checked }))} /><span className="text-sm">Recurring monthly</span></label>
            <button onClick={() => addMut.mutate()} disabled={!newExp.title || !newExp.amount || addMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{addMut.isPending ? "Adding…" : "Add Expense"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
