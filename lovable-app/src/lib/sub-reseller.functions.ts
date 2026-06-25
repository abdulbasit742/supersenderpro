import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SubReseller {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  commissionRate: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  status: "active" | "suspended" | "pending";
  joinedAt: string;
  lastOrderAt?: string;
  referralCode: string;
  allowedProducts?: string[];
}

export interface CommissionRecord {
  id: string;
  resellerId: string;
  resellerName: string;
  orderId: string;
  product: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  paidAt?: string;
}

export interface ResellerInvite {
  id: string;
  email?: string;
  whatsapp?: string;
  inviteCode: string;
  commissionRate: number;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
}

const MOCK_RESELLERS: SubReseller[] = [
  { id: "r1", name: "Hassan Traders", whatsapp: "03001111111", email: "hassan@example.com", commissionRate: 15, totalOrders: 47, totalRevenue: 187000, totalCommission: 28050, pendingCommission: 5400, status: "active", joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastOrderAt: new Date(Date.now() - 86400000).toISOString(), referralCode: "HASSAN15" },
  { id: "r2", name: "Digital Zone PK", whatsapp: "03112222222", commissionRate: 12, totalOrders: 28, totalRevenue: 98000, totalCommission: 11760, pendingCommission: 2400, status: "active", joinedAt: new Date(Date.now() - 14 * 86400000).toISOString(), lastOrderAt: new Date(Date.now() - 3 * 86400000).toISOString(), referralCode: "DZONE12" },
  { id: "r3", name: "Ali Tech", whatsapp: "03213333333", commissionRate: 10, totalOrders: 5, totalRevenue: 18500, totalCommission: 1850, pendingCommission: 1850, status: "pending", joinedAt: new Date(Date.now() - 3 * 86400000).toISOString(), referralCode: "ALITECH10" },
];

const MOCK_COMMISSIONS: CommissionRecord[] = [
  { id: "c1", resellerId: "r1", resellerName: "Hassan Traders", orderId: "o1", product: "ChatGPT Plus", saleAmount: 4200, commissionRate: 15, commissionAmount: 630, status: "pending", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "c2", resellerId: "r1", resellerName: "Hassan Traders", orderId: "o2", product: "Claude Pro", saleAmount: 3500, commissionRate: 15, commissionAmount: 525, status: "paid", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), paidAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "c3", resellerId: "r2", resellerName: "Digital Zone PK", orderId: "o3", product: "LinkedIn Premium", saleAmount: 5500, commissionRate: 12, commissionAmount: 660, status: "pending", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

export const getSubResellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_RESELLERS);

export const getCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ resellerId: z.string().optional() }).parse(d))
  .handler(async ({ data }) => data.resellerId ? MOCK_COMMISSIONS.filter(c => c.resellerId === data.resellerId) : MOCK_COMMISSIONS);

export const inviteReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ whatsapp: z.string().optional(), email: z.string().email().optional(), commissionRate: z.number().min(1).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const code = `RESELLER${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (data.whatsapp && token && phoneId) {
      const msg = `Assalam Alaikum! 🎉\n\nYou've been invited to join *SuperSender Pro* as a reseller!\n\n✅ Commission: ${data.commissionRate}%\n📱 Join via: Your referral code is *${code}*\n\nStart selling and earn from day 1! 💰\n\n_SuperSender Pro_`;
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g, ""), type: "text", text: { body: msg } }) });
    }
    return { ok: true, inviteCode: code, demo: !token } as ResellerInvite & { ok: boolean; demo: boolean };
  });

export const markCommissionPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ commissionIds: z.array(z.string()) }).parse(d))
  .handler(async ({ data }) => ({ ok: true, paid: data.commissionIds.length }));

export const updateResellerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), status: z.enum(["active","suspended","pending"]) }).parse(d))
  .handler(async () => ({ ok: true }));
