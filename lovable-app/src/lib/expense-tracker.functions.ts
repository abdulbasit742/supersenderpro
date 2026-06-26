import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type ExpenseCategory = "inventory" | "marketing" | "tools" | "salary" | "office" | "shipping" | "tax" | "other";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringInterval?: "monthly" | "yearly";
}

export interface ExpenseSummary {
  totalThisMonth: number;
  totalLastMonth: number;
  totalThisYear: number;
  byCategory: Record<ExpenseCategory, number>;
  grossRevenue: number;
  netProfit: number;
  profitMargin: number;
}

function makeExp(i: number): Expense {
  const cats: ExpenseCategory[] = ["inventory","marketing","tools","salary","office","shipping","tax","other"];
  const titles = ["Product procurement","Facebook Ads","Canva Pro subscription","Team salary","Office rent","Courier charges","Monthly tax filing","Miscellaneous"];
  const amounts = [45000, 8000, 1800, 25000, 15000, 3200, 6500, 2000];
  const d = new Date(); d.setDate(d.getDate() - i * 3);
  return { id: `ex${i}`, title: titles[i % titles.length], category: cats[i % cats.length], amount: amounts[i % amounts.length], date: d.toISOString().split("T")[0], notes: i % 3 === 0 ? "Recurring monthly expense" : undefined, isRecurring: i % 4 === 0, recurringInterval: i % 4 === 0 ? "monthly" : undefined };
}

const MOCK_EXPENSES: Expense[] = Array.from({ length: 12 }, (_, i) => makeExp(i));

export const getExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ month: z.string().optional() }))
  .handler(async () => MOCK_EXPENSES);

export const getExpenseSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ExpenseSummary> => {
    const total = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0);
    const byCat = {} as Record<ExpenseCategory, number>;
    MOCK_EXPENSES.forEach(e => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount; });
    return { totalThisMonth: total, totalLastMonth: total * 0.9, totalThisYear: total * 11, byCategory: byCat, grossRevenue: 485000, netProfit: 485000 - total, profitMargin: Math.round(((485000 - total) / 485000) * 100) };
  });

export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ title: z.string(), category: z.string(), amount: z.number(), date: z.string(), notes: z.string().optional(), isRecurring: z.boolean().optional() }))
  .handler(async ({ data }) => ({ success: true, id: `ex_${Date.now()}`, ...data }));

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async () => ({ success: true }));
