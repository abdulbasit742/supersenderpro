import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";
import type { WATemplate, WATemplateComponent, WAButton } from "./meta-business.functions";

const META_BASE = "https://graph.facebook.com/v21.0";
function metaHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const MOCK_TEMPLATES: WATemplate[] = [
  { id: "1", name: "order_confirmation", language: "en", category: "UTILITY", status: "APPROVED", components: [{ type: "HEADER", format: "TEXT", text: "Order Confirmed!" }, { type: "BODY", text: "Hi {{1}}, your order for {{2}} worth PKR {{3}} has been confirmed. We'll deliver within 24 hours. Order ID: {{4}}" }, { type: "FOOTER", text: "SuperSender Pro" }, { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Track Order" }] }] },
  { id: "2", name: "renewal_reminder", language: "en", category: "UTILITY", status: "APPROVED", components: [{ type: "BODY", text: "Hi {{1}}, your {{2}} subscription expires in {{3}} days. Renew now to avoid interruption. Click below:" }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Renew Now", url: "https://pay.example.com/{{1}}" }] }] },
  { id: "3", name: "payment_received", language: "en", category: "UTILITY", status: "APPROVED", components: [{ type: "BODY", text: "Payment received! PKR {{1}} from {{2}} via {{3}}. Your subscription is active until {{4}}. Thank you! 🎉" }] },
  { id: "4", name: "flash_sale", language: "en", category: "MARKETING", status: "APPROVED", components: [{ type: "HEADER", format: "IMAGE" }, { type: "BODY", text: "🔥 Flash Sale! {{1}} is now PKR {{2}} (was {{3}}). Only {{4}} hours left! Don't miss out." }, { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Order Now" }, { type: "QUICK_REPLY", text: "Not Interested" }] }] },
  { id: "5", name: "welcome_new_customer", language: "en", category: "UTILITY", status: "PENDING", components: [{ type: "BODY", text: "Welcome to SuperSender Pro, {{1}}! 🎉 We're here to help you with all your subscription needs. Reply *HELP* anytime." }] },
];

export const getTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const wabaId = process.env.META_WABA_ID ?? "";
    if (!token || !wabaId) return MOCK_TEMPLATES;

    const r = await fetch(`${META_BASE}/${wabaId}/message_templates?fields=id,name,language,category,status,components,quality_score&limit=100`, { headers: metaHeaders(token) });
    if (!r.ok) return MOCK_TEMPLATES;
    const j = await r.json() as { data?: WATemplate[] };
    return j.data ?? MOCK_TEMPLATES;
  });

const ComponentSchema = z.object({
  type: z.enum(["HEADER", "BODY", "FOOTER", "BUTTONS"]),
  format: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
  text: z.string().optional(),
  buttons: z.array(z.object({
    type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER"]),
    text: z.string(),
    url: z.string().optional(),
    phoneNumber: z.string().optional(),
  })).optional(),
});

export const createTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(1).max(512).regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
    language: z.string().default("en"),
    category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
    components: z.array(ComponentSchema),
  }).parse(d))
  .handler(async ({ data }) => {
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const wabaId = process.env.META_WABA_ID ?? "";
    if (!token || !wabaId) return { ok: true, demo: true, id: "demo_" + Date.now() };

    const r = await fetch(`${META_BASE}/${wabaId}/message_templates`, {
      method: "POST",
      headers: metaHeaders(token),
      body: JSON.stringify({ name: data.name, language: data.language, category: data.category, components: data.components }),
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`Meta API: ${e}`); }
    const j = await r.json() as { id: string };
    await logAuditEvent({ data: { action: `Template created: ${data.name}`, targetType: "wa_template", severity: "success" } });
    return { ok: true, id: j.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string(), id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const wabaId = process.env.META_WABA_ID ?? "";
    if (!token || !wabaId) return { ok: true, demo: true };
    const r = await fetch(`${META_BASE}/${wabaId}/message_templates?hsm_id=${data.id}&name=${data.name}`, { method: "DELETE", headers: metaHeaders(token) });
    if (!r.ok) { const e = await r.text(); throw new Error(`Delete failed: ${e}`); }
    await logAuditEvent({ data: { action: `Template deleted: ${data.name}`, targetType: "wa_template", severity: "warning" } });
    return { ok: true };
  });

export const sendTemplateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    to: z.string().min(10),
    templateName: z.string(),
    language: z.string().default("en"),
    parameters: z.array(z.string()).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (!token || !phoneId) return { ok: true, demo: true, messageId: "demo_" + Date.now() };

    const components = data.parameters?.length ? [{
      type: "body",
      parameters: data.parameters.map((v) => ({ type: "text", text: v })),
    }] : [];

    const r = await fetch(`${META_BASE}/${phoneId}/messages`, {
      method: "POST",
      headers: metaHeaders(token),
      body: JSON.stringify({ messaging_product: "whatsapp", to: data.to, type: "template", template: { name: data.templateName, language: { code: data.language }, components } }),
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`Send failed: ${e}`); }
    const j = await r.json() as { messages?: Array<{ id: string }> };
    await logAuditEvent({ data: { action: `Template message sent: ${data.templateName}`, target: data.to, targetType: "wa_message", severity: "success" } });
    return { ok: true, messageId: j.messages?.[0]?.id };
  });

export { type WATemplate, type WATemplateComponent, type WAButton };
