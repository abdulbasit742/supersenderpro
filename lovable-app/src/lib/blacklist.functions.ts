import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type BlacklistReason = "fraud" | "chargeback" | "spam" | "abusive" | "duplicate" | "other";

export interface BlacklistEntry {
  id: string;
  whatsapp: string;
  name?: string;
  reason: BlacklistReason;
  notes: string;
  addedBy: string;
  addedAt: string;
  orderCount: number;
  totalLoss: number;
}

const REASON_LABELS: Record<BlacklistReason, string> = { fraud: "Fraud / Scam", chargeback: "Chargeback", spam: "Spam / Fake", abusive: "Abusive Behaviour", duplicate: "Duplicate Account", other: "Other" };
const REASON_COLORS: Record<BlacklistReason, string> = { fraud: "bg-red-100 text-red-800", chargeback: "bg-orange-100 text-orange-700", spam: "bg-yellow-100 text-yellow-700", abusive: "bg-purple-100 text-purple-700", duplicate: "bg-blue-100 text-blue-700", other: "bg-gray-100 text-gray-600" };

const MOCK_ENTRIES: BlacklistEntry[] = [
  { id: "bl1", whatsapp: "03001112233", name: "Fake Ahmed", reason: "fraud", notes: "Ordered twice, never paid. Blocked delivery 3 times. Total loss PKR 9000.", addedBy: "Imran", addedAt: new Date(Date.now() - 14 * 86400000).toISOString(), orderCount: 2, totalLoss: 9000 },
  { id: "bl2", whatsapp: "03112223344", name: "Unknown", reason: "chargeback", notes: "Disputed JazzCash payment after product delivered.", addedBy: "Ayesha", addedAt: new Date(Date.now() - 7 * 86400000).toISOString(), orderCount: 1, totalLoss: 3500 },
  { id: "bl3", whatsapp: "03223334455", reason: "spam", notes: "Sending bulk spam messages to our WA number.", addedBy: "System", addedAt: new Date(Date.now() - 3 * 86400000).toISOString(), orderCount: 0, totalLoss: 0 },
  { id: "bl4", whatsapp: "03334445566", name: "Bilal Scammer", reason: "fraud", notes: "Shared fake payment screenshots 4 times.", addedBy: "Usman", addedAt: new Date(Date.now() - 30 * 86400000).toISOString(), orderCount: 4, totalLoss: 14000 },
];

export { REASON_LABELS, REASON_COLORS };
export const getBlacklist = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_ENTRIES);
export const addToBlacklist = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ whatsapp: z.string(), name: z.string().optional(), reason: z.string(), notes: z.string() })).handler(async ({ data }) => ({ success: true, id: `bl_${Date.now()}`, ...data, addedBy: "You", addedAt: new Date().toISOString() }));
export const removeFromBlacklist = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ entryId: z.string() })).handler(async () => ({ success: true }));
export const checkBlacklist = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ whatsapp: z.string() })).handler(async ({ data }) => { const found = MOCK_ENTRIES.find(e => e.whatsapp === data.whatsapp); return { isBlacklisted: !!found, entry: found ?? null }; });
