import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";

export type LeakageType = "unpaid_order" | "expired_sub" | "duplicate_charge" | "missed_renewal" | "pending_payment" | "refund_overdue";

export interface LeakageItem {
  id: string;
  type: LeakageType;
  customerName: string;
  whatsapp: string;
  amount: number;
  product: string;
  daysSince: number;
  description: string;
  priority: "critical" | "high" | "medium";
  actionTaken: boolean;
}

export interface LeakageSummary {
  totalLeakage: number;
  itemCount: number;
  byType: Record<LeakageType, number>;
  recoveredThisMonth: number;
}

const MOCK_ITEMS: LeakageItem[] = [
  { id: "lk1", type: "unpaid_order", customerName: "Ahmed Khan", whatsapp: "03001234567", amount: 3500, product: "ChatGPT Plus", daysSince: 12, description: "Order placed 12 days ago, payment not confirmed", priority: "critical", actionTaken: false },
  { id: "lk2", type: "expired_sub", customerName: "Sara Ali", whatsapp: "03111234567", amount: 2500, product: "Netflix Premium", daysSince: 8, description: "Subscription expired, no renewal order received", priority: "high", actionTaken: false },
  { id: "lk3", type: "missed_renewal", customerName: "Bilal Raza", whatsapp: "03211234567", amount: 4200, product: "Midjourney Pro", daysSince: 5, description: "Renewal due 5 days ago, customer not responded", priority: "high", actionTaken: true },
  { id: "lk4", type: "pending_payment", customerName: "Fatima Noor", whatsapp: "03321234567", amount: 1800, product: "Canva Pro", daysSince: 3, description: "Payment screenshot received but not verified", priority: "medium", actionTaken: false },
  { id: "lk5", type: "unpaid_order", customerName: "Hassan Malik", whatsapp: "03421234567", amount: 4500, product: "Adobe CC", daysSince: 18, description: "COD order never paid, delivered 18 days ago", priority: "critical", actionTaken: false },
  { id: "lk6", type: "duplicate_charge", customerName: "Zara Baig", whatsapp: "03521234567", amount: 3500, product: "ChatGPT Plus", daysSince: 2, description: "Customer charged twice for same order — pending refund", priority: "critical", actionTaken: false },
  { id: "lk7", type: "refund_overdue", customerName: "Omar Qureshi", whatsapp: "03621234567", amount: 2500, product: "Netflix Premium", daysSince: 7, description: "Approved refund not processed in 7 days", priority: "high", actionTaken: false },
  { id: "lk8", type: "expired_sub", customerName: "Nadia Shah", whatsapp: "03721234567", amount: 1200, product: "Spotify Family", daysSince: 14, description: "Subscription expired, no contact made yet", priority: "medium", actionTaken: false },
];

export const getLeakageItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_ITEMS);

export const getLeakageSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<LeakageSummary> => {
    const total = MOCK_ITEMS.filter(i => !i.actionTaken).reduce((s, i) => s + i.amount, 0);
    const byType = {} as Record<LeakageType, number>;
    MOCK_ITEMS.forEach(i => { byType[i.type] = (byType[i.type] ?? 0) + i.amount; });
    return { totalLeakage: total, itemCount: MOCK_ITEMS.filter(i => !i.actionTaken).length, byType, recoveredThisMonth: 45000 };
  });

export const markActionTaken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ success: true }));

export const sendRecoveryMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ success: true, note: "Demo: Recovery message sent via WhatsApp" }));
