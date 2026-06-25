import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface WAAccount {
  id: string;
  label: string;
  phoneNumber: string;
  wabaId?: string;
  phoneNumberId?: string;
  token?: string;
  status: "connected" | "disconnected" | "pending";
  isPrimary: boolean;
  messagesSentToday: number;
  totalMessagesSent: number;
  quality: "green" | "yellow" | "red";
  addedAt: string;
  lastUsedAt?: string;
}

export interface WARoutingRule {
  id: string;
  name: string;
  condition: string;
  targetAccountId: string;
  priority: number;
  isActive: boolean;
}

const MOCK_ACCOUNTS: WAAccount[] = [
  { id: "wa1", label: "Main Business", phoneNumber: "+92 300 1234567", wabaId: "WABA123", phoneNumberId: "PHN123", status: "connected", isPrimary: true, messagesSentToday: 234, totalMessagesSent: 8942, quality: "green", addedAt: new Date(Date.now() - 60 * 86400000).toISOString(), lastUsedAt: new Date(Date.now() - 600000).toISOString() },
  { id: "wa2", label: "Customer Support", phoneNumber: "+92 311 2345678", status: "connected", isPrimary: false, messagesSentToday: 89, totalMessagesSent: 3421, quality: "yellow", addedAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastUsedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "wa3", label: "Bulk Broadcasts", phoneNumber: "+92 321 3456789", status: "disconnected", isPrimary: false, messagesSentToday: 0, totalMessagesSent: 1200, quality: "red", addedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
];

const MOCK_ROUTING: WARoutingRule[] = [
  { id: "r1", name: "Broadcasts → Bulk Account", condition: "message_type = broadcast", targetAccountId: "wa3", priority: 1, isActive: true },
  { id: "r2", name: "Support queries → Support Account", condition: "message_contains = help, issue, problem", targetAccountId: "wa2", priority: 2, isActive: true },
  { id: "r3", name: "All others → Main", condition: "default", targetAccountId: "wa1", priority: 99, isActive: true },
];

export const getWAAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_ACCOUNTS);

export const getRoutingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_ROUTING);

export const addWAAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ label: z.string().min(1), phoneNumber: z.string().min(10), token: z.string().optional(), phoneNumberId: z.string().optional(), wabaId: z.string().optional() }).parse(d))
  .handler(async ({ data }) => ({ ok: true, id: `wa_${Date.now()}`, label: data.label, status: "pending" }));

export const setPrimaryAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async () => ({ ok: true }));

export const removeWAAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async () => ({ ok: true }));

export const saveRoutingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async () => ({ ok: true }));

export const getWAStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    totalAccounts: MOCK_ACCOUNTS.length,
    connectedAccounts: MOCK_ACCOUNTS.filter(a => a.status === "connected").length,
    totalMessagesSentToday: MOCK_ACCOUNTS.reduce((s, a) => s + a.messagesSentToday, 0),
    totalMessagesSent: MOCK_ACCOUNTS.reduce((s, a) => s + a.totalMessagesSent, 0),
  }));
