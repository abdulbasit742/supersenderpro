import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

const META_BASE = "https://graph.facebook.com/v21.0";

function metaHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function getMetaCreds() {
  return {
    token: process.env.META_WHATSAPP_TOKEN ?? "",
    phoneId: process.env.META_PHONE_NUMBER_ID ?? "",
    wabaId: process.env.META_WABA_ID ?? "",
  };
}

export interface WAProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profilePictureUrl?: string;
  websites?: string[];
  vertical?: string;
  messagingProduct: string;
}

export interface WATemplate {
  id: string;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
  components: WATemplateComponent[];
  qualityScore?: string;
}

export interface WATemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: WAButton[];
  example?: Record<string, unknown>;
}

export interface WAButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface WAMetrics {
  sent: number;
  delivered: number;
  read: number;
  clicked?: number;
  period: string;
}

export interface WAPhoneNumber {
  id: string;
  displayName: string;
  phoneNumber: string;
  verifiedName?: string;
  qualityRating?: string;
  codeSendingStatus?: string;
  status?: string;
}

// ─── Business Profile ──────────────────────────────────────────────────────────

export const getWhatsAppProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { token, phoneId } = getMetaCreds();
    if (!token || !phoneId) {
      return { about: "Demo Business", description: "AI-powered reseller platform", messagingProduct: "whatsapp", vertical: "RETAIL", websites: [] } as WAProfile;
    }
    const r = await fetch(`${META_BASE}/${phoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical,messaging_product`, { headers: metaHeaders(token) });
    if (!r.ok) throw new Error(`Meta API error ${r.status}`);
    const j = await r.json() as { data?: WAProfile[] };
    return j.data?.[0] ?? { messagingProduct: "whatsapp" };
  });

export const updateWhatsAppProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    about: z.string().max(139).optional(),
    address: z.string().max(256).optional(),
    description: z.string().max(512).optional(),
    email: z.string().email().optional(),
    websites: z.array(z.string().url()).max(2).optional(),
    vertical: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { token, phoneId } = getMetaCreds();
    if (!token || !phoneId) return { ok: true, demo: true };
    const r = await fetch(`${META_BASE}/${phoneId}/whatsapp_business_profile`, {
      method: "POST",
      headers: metaHeaders(token),
      body: JSON.stringify({ messaging_product: "whatsapp", ...data }),
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`Meta API error: ${e}`); }
    await logAuditEvent({ data: { action: "WA Business profile updated", targetType: "meta_profile", severity: "info" } });
    return { ok: true };
  });

// ─── Phone Numbers ─────────────────────────────────────────────────────────────

export const getPhoneNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { token, wabaId } = getMetaCreds();
    if (!token || !wabaId) {
      return [{ id: "demo-123", displayName: "Demo Business", phoneNumber: "+92 300 0000000", qualityRating: "GREEN", status: "CONNECTED" }] as WAPhoneNumber[];
    }
    const r = await fetch(`${META_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_sending_status,status`, { headers: metaHeaders(token) });
    if (!r.ok) throw new Error(`Meta API error ${r.status}`);
    const j = await r.json() as { data?: Record<string, unknown>[] };
    return (j.data ?? []).map((p) => ({ id: String(p.id), displayName: String(p.display_phone_number ?? ""), phoneNumber: String(p.display_phone_number ?? ""), verifiedName: p.verified_name as string, qualityRating: p.quality_rating as string, codeSendingStatus: p.code_sending_status as string, status: p.status as string })) as WAPhoneNumber[];
  });

// ─── Analytics ─────────────────────────────────────────────────────────────────

export const getMessagingMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ start: z.string(), end: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { token, phoneId } = getMetaCreds();
    if (!token || !phoneId) {
      return { sent: 1240, delivered: 1198, read: 876, clicked: 312, period: data.start } as WAMetrics;
    }
    const r = await fetch(`${META_BASE}/${phoneId}?fields=analytics.since(${data.start}).until(${data.end}).granularity(DAY)`, { headers: metaHeaders(token) });
    if (!r.ok) throw new Error(`Meta API error ${r.status}`);
    const j = await r.json() as { analytics?: { data?: Array<Record<string, unknown>> } };
    const rows = j.analytics?.data ?? [];
    const totals = rows.reduce((acc, row) => {
      acc.sent += Number((row.data_points as Record<string, unknown>[])?.[0]?.value ?? 0);
      return acc;
    }, { sent: 0, delivered: 0, read: 0, period: data.start });
    return { ...totals, clicked: 0 } as WAMetrics;
  });

// ─── Send message (test) ───────────────────────────────────────────────────────

export const sendTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().min(10), message: z.string().min(1).max(4096) }).parse(d))
  .handler(async ({ data }) => {
    const { token, phoneId } = getMetaCreds();
    if (!token || !phoneId) return { ok: true, demo: true, messageId: "demo_msg_" + Date.now() };
    const r = await fetch(`${META_BASE}/${phoneId}/messages`, {
      method: "POST",
      headers: metaHeaders(token),
      body: JSON.stringify({ messaging_product: "whatsapp", to: data.to, type: "text", text: { body: data.message } }),
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`Send failed: ${e}`); }
    const j = await r.json() as { messages?: Array<{ id: string }> };
    await logAuditEvent({ data: { action: "Test message sent via Meta API", target: data.to, targetType: "meta_message", severity: "success" } });
    return { ok: true, messageId: j.messages?.[0]?.id };
  });

// ─── Webhook config ────────────────────────────────────────────────────────────

export const getWebhookStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("user_settings").select("settings").eq("user_id", userId).single();
    const settings = (data?.settings ?? {}) as Record<string, unknown>;
    return {
      webhookUrl: settings.metaWebhookUrl as string | undefined ?? `${process.env.VITE_APP_URL ?? "https://your-app.com"}/api/webhook/meta-wa`,
      verifyToken: settings.metaVerifyToken as string | undefined ?? "your_verify_token",
      isConnected: Boolean(process.env.META_WHATSAPP_TOKEN),
      lastEventAt: settings.metaLastEventAt as string | undefined,
    };
  });
