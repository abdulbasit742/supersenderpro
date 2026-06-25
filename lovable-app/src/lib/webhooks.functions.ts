import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export type WebhookEvent = "order.created" | "order.updated" | "payment.received" | "customer.created" | "renewal.due" | "stock.low" | "broadcast.sent" | "churn.detected";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  secret?: string;
  headers?: Record<string, string>;
  lastTriggeredAt?: string;
  lastStatus?: number;
  totalFired: number;
  failureCount: number;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  duration?: number;
  success: boolean;
  firedAt: string;
}

export interface ZapierTemplate {
  name: string;
  description: string;
  triggerEvent: WebhookEvent;
  samplePayload: Record<string, unknown>;
  zapierUrl: string;
}

const ZAPIER_TEMPLATES: ZapierTemplate[] = [
  { name: "New Order → Google Sheets", description: "Log every order to a Google Sheet automatically", triggerEvent: "order.created", samplePayload: { event: "order.created", orderId: "uuid", customerName: "Ahmed", product: "ChatGPT Plus", amount: 1500, timestamp: new Date().toISOString() }, zapierUrl: "https://zapier.com/apps/google-sheets/integrations/webhook" },
  { name: "Payment Received → Slack", description: "Alert your team on Slack when payment arrives", triggerEvent: "payment.received", samplePayload: { event: "payment.received", customer: "Ahmed", amount: 1500, method: "JazzCash", timestamp: new Date().toISOString() }, zapierUrl: "https://zapier.com/apps/slack/integrations/webhook" },
  { name: "New Customer → Notion", description: "Add new customers to your Notion CRM", triggerEvent: "customer.created", samplePayload: { event: "customer.created", name: "Ahmed Khan", whatsapp: "03001234567", timestamp: new Date().toISOString() }, zapierUrl: "https://zapier.com/apps/notion/integrations/webhook" },
  { name: "Renewal Due → WhatsApp (via Twilio)", description: "Auto-send renewal reminders via Twilio", triggerEvent: "renewal.due", samplePayload: { event: "renewal.due", customerName: "Sara", product: "Claude Pro", daysLeft: 3, timestamp: new Date().toISOString() }, zapierUrl: "https://zapier.com/apps/twilio/integrations/webhook" },
  { name: "Low Stock → Email Alert", description: "Email when stock drops below threshold", triggerEvent: "stock.low", samplePayload: { event: "stock.low", product: "ChatGPT Plus", stockLeft: 3, threshold: 5, timestamp: new Date().toISOString() }, zapierUrl: "https://zapier.com/apps/email/integrations/webhook" },
];

export const getWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("webhooks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []) as Webhook[];
  });

export const saveWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    url: z.string().url(),
    events: z.array(z.enum(["order.created","order.updated","payment.received","customer.created","renewal.due","stock.low","broadcast.sent","churn.detected"])),
    isActive: z.boolean().optional(),
    secret: z.string().max(100).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const payload: Record<string, unknown> = { user_id: userId, name: data.name, url: data.url, events: data.events, is_active: data.isActive ?? true, secret: data.secret, headers: data.headers ?? {}, total_fired: 0, failure_count: 0 };
    if (data.id) {
      const { data: r } = await db.from("webhooks").update(payload).eq("id", data.id).eq("user_id", userId).select().single();
      return r;
    }
    const { data: r } = await db.from("webhooks").insert(payload).select().single();
    await logAuditEvent({ data: { action: `Webhook created: ${data.name}`, targetType: "webhook", severity: "success" } });
    return r;
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("webhooks").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().url(), event: z.string(), secret: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const payload = { event: data.event, test: true, timestamp: new Date().toISOString(), data: { message: "This is a test webhook from SuperSender Pro" } };
    const headers: Record<string, string> = { "Content-Type": "application/json", "X-SuperSender-Event": data.event };
    if (data.secret) headers["X-SuperSender-Signature"] = `sha256=${data.secret}`;
    const start = Date.now();
    try {
      const r = await fetch(data.url, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
      const duration = Date.now() - start;
      const body = await r.text().catch(() => "");
      return { ok: r.ok, status: r.status, duration, body: body.substring(0, 500) };
    } catch (e: unknown) {
      return { ok: false, status: 0, duration: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
    }
  });

export const getWebhookLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ webhookId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    let q = db.from("webhook_logs").select("*").eq("user_id", userId).order("fired_at", { ascending: false }).limit(100);
    if (data.webhookId) q = q.eq("webhook_id", data.webhookId);
    const { data: logs } = await q;
    return (logs ?? []) as WebhookLog[];
  });

export const getZapierTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ZAPIER_TEMPLATES);

export async function fireWebhookEvent(userId: string, event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  // Called internally when events happen — fires all matching active webhooks for user
  // Implementation would query webhooks and fan-out POST requests
}
