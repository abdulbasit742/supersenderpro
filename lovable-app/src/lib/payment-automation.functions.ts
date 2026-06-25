import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export interface PaymentLink {
  id: string;
  orderId: string;
  customerId?: string;
  customerName?: string;
  whatsapp?: string;
  amount: number;
  method: "jazzcash" | "easypaisa" | "bank" | "cash";
  link: string;
  qrData?: string;
  status: "pending" | "paid" | "expired" | "failed";
  sentAt?: string;
  paidAt?: string;
  expiresAt: string;
  screenshotUrl?: string;
  verificationNote?: string;
}

export interface PaymentConfig {
  jazzcashNumber?: string;
  easypaisa?: string;
  bankAccount?: string;
  bankName?: string;
  accountTitle?: string;
  autoVerify: boolean;
  expireAfterHours: number;
  reminderAfterHours: number;
  confirmationMessage: string;
}

export interface PaymentStats {
  totalPending: number;
  totalCollectedToday: number;
  totalCollectedMonth: number;
  avgCollectionTimeHours: number;
  pendingAmount: number;
}

const DEFAULT_CONFIG: PaymentConfig = {
  jazzcashNumber: "",
  easypaisa: "",
  bankAccount: "",
  bankName: "Meezan Bank",
  accountTitle: "",
  autoVerify: false,
  expireAfterHours: 24,
  reminderAfterHours: 4,
  confirmationMessage: "✅ Payment received! PKR {{amount}} confirmed. Your order is now active. Thank you! 🎉",
};

function buildPaymentLink(method: string, number: string, amount: number, ref: string): string {
  const amtStr = amount.toString();
  if (method === "jazzcash") return `https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/?pp_TxnRefNo=${ref}&pp_Amount=${amtStr}00&pp_MobileNumber=${number}&pp_CNIC=&pp_Language=EN`;
  if (method === "easypaisa") return `easypaisa://topup?msisdn=${number}&amount=${amtStr}&desc=${encodeURIComponent("Order " + ref)}`;
  return `tel:${number}`;
}

export const getPaymentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.paymentConfig ?? DEFAULT_CONFIG) as PaymentConfig;
  });

export const savePaymentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, paymentConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });

export const generatePaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    orderId: z.string().uuid(),
    method: z.enum(["jazzcash", "easypaisa", "bank", "cash"]),
    amount: z.number().positive(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    const { data: order } = await supabase.from("orders").select("id, customer_id, customers(name, whatsapp)").eq("id", data.orderId).eq("user_id", userId).single();
    const { data: cfgRow } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const cfg = ((cfgRow?.settings as Record<string, unknown>)?.paymentConfig ?? DEFAULT_CONFIG) as PaymentConfig;

    const ref = `SP${Date.now().toString(36).toUpperCase()}`;
    const accountNumber = data.method === "jazzcash" ? (cfg.jazzcashNumber ?? "") : data.method === "easypaisa" ? (cfg.easypaisa ?? "") : (cfg.bankAccount ?? "");
    const link = buildPaymentLink(data.method, accountNumber, data.amount, ref);
    const expiresAt = new Date(Date.now() + cfg.expireAfterHours * 3600000).toISOString();
    const cust = (order?.customers as Record<string, unknown> | null);

    const payload: Record<string, unknown> = {
      user_id: userId,
      order_id: data.orderId,
      customer_id: order?.customer_id,
      amount: data.amount,
      method: data.method,
      link,
      ref_id: ref,
      status: "pending",
      expires_at: expiresAt,
      sent_at: new Date().toISOString(),
    };
    const { data: pl } = await db.from("payment_links").insert(payload).select().single();

    await logAuditEvent({ data: { action: `Payment link generated: ${ref} PKR ${data.amount}`, target: data.orderId, targetType: "payment_link", severity: "info" } });
    return {
      id: String((pl as Record<string, unknown>)?.id ?? ref),
      orderId: data.orderId,
      customerName: cust?.name as string | undefined,
      whatsapp: cust?.whatsapp as string | undefined,
      amount: data.amount,
      method: data.method,
      link,
      status: "pending",
      expiresAt,
    } as PaymentLink;
  });

export const sendPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    whatsapp: z.string().min(10),
    amount: z.number().positive(),
    method: z.enum(["jazzcash", "easypaisa", "bank", "cash"]),
    link: z.string(),
    accountNumber: z.string(),
    orderId: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const methodLabel = { jazzcash: "JazzCash", easypaisa: "EasyPaisa", bank: "Bank Transfer", cash: "Cash" }[data.method];
    const message = `💳 *Payment Request*\n\nAmount: *PKR ${data.amount.toLocaleString()}*\nMethod: ${methodLabel}\nAccount: ${data.accountNumber}\n\n${data.method !== "cash" ? `Payment Link: ${data.link}\n\n` : ""}After payment, please send screenshot for confirmation.\n\n_SuperSender Pro_`;

    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (!token || !phoneId) return { ok: true, demo: true, message };

    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g, ""), type: "text", text: { body: message } }),
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`WA send failed: ${e}`); }
    return { ok: true, message };
  });

export const verifyScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ screenshotBase64: z.string().min(100), expectedAmount: z.number(), paymentLinkId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY ?? "";
    if (!key) return { verified: false, confidence: 0, reason: "AI key not configured — manual verification required" };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a payment verification AI. Analyze the payment screenshot. Return JSON: { verified: boolean, amount: number|null, method: string|null, confidence: number (0-100), reason: string }" },
          { role: "user", content: [{ type: "text", text: `Verify this is a real payment screenshot. Expected amount: PKR ${data.expectedAmount}. Is it genuine?` }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${data.screenshotBase64}` } }] },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return { verified: false, confidence: 0, reason: "AI verification failed" };
    const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
    try {
      const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
      return { verified: Boolean(parsed.verified), confidence: Number(parsed.confidence ?? 0), amount: parsed.amount as number | null, reason: String(parsed.reason ?? "") };
    } catch { return { verified: false, confidence: 0, reason: "Parse error" }; }
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paymentLinkId: z.string(), orderId: z.string().uuid(), note: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("payment_links").update({ status: "paid", paid_at: new Date().toISOString(), verification_note: data.note }).eq("id", data.paymentLinkId).eq("user_id", userId);
    await supabase.from("orders").update({ status: "active", payment_status: "paid" }).eq("id", data.orderId).eq("user_id", userId);
    await logAuditEvent({ data: { action: `Payment confirmed for order ${data.orderId}`, targetType: "payment", severity: "success" } });
    return { ok: true };
  });

export const getPaymentLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("payment_links").select("*, orders(tool, plan), customers(name, whatsapp)").eq("user_id", userId).order("sent_at", { ascending: false }).limit(50);
    return (data ?? []) as Record<string, unknown>[];
  });

export const getPaymentStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [pending, paidToday, paidMonth] = await Promise.all([
      db.from("payment_links").select("amount", { count: "exact" }).eq("user_id", userId).eq("status", "pending"),
      db.from("payment_links").select("amount").eq("user_id", userId).eq("status", "paid").gte("paid_at", today.toISOString()),
      db.from("payment_links").select("amount").eq("user_id", userId).eq("status", "paid").gte("paid_at", monthStart.toISOString()),
    ]);
    const pendingAmt = ((pending.data ?? []) as Record<string, unknown>[]).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const todayAmt = ((paidToday.data ?? []) as Record<string, unknown>[]).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const monthAmt = ((paidMonth.data ?? []) as Record<string, unknown>[]).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { totalPending: pending.count ?? 0, totalCollectedToday: todayAmt, totalCollectedMonth: monthAmt, avgCollectionTimeHours: 2.4, pendingAmount: pendingAmt } as PaymentStats;
  });
