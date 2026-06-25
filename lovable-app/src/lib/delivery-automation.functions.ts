import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DeliveryTemplate {
  id: string;
  productName: string;
  credentialFields: string[];
  messageTemplate: string;
  isActive: boolean;
  autoSendOnPayment: boolean;
  createdAt: string;
}

export interface DeliveryLog {
  id: string;
  orderId: string;
  customerId?: string;
  customerName?: string;
  whatsapp: string;
  product: string;
  credentials: Record<string, string>;
  status: "sent" | "failed" | "pending";
  sentAt?: string;
  error?: string;
}

export interface DeliveryConfig {
  autoDeliverOnPayment: boolean;
  deliveryDelayMinutes: number;
  retryOnFailure: boolean;
  maxRetries: number;
  defaultMessage: string;
}

const DEFAULT_CONFIG: DeliveryConfig = {
  autoDeliverOnPayment: true,
  deliveryDelayMinutes: 0,
  retryOnFailure: true,
  maxRetries: 3,
  defaultMessage: "Assalam Alaikum {{name}}! 🎉\n\nYour *{{product}}* is ready!\n\n{{credentials}}\n\n⚠️ Please keep these credentials safe. Do NOT share with anyone.\n\nEnjoy! 😊\n\n_SuperSender Pro_",
};

const MOCK_TEMPLATES: DeliveryTemplate[] = [
  { id: "dt1", productName: "ChatGPT Plus", credentialFields: ["email", "password"], messageTemplate: "Assalam Alaikum {{name}}! 🎉\n\nYour *ChatGPT Plus* is ready!\n\n📧 Email: {{email}}\n🔑 Password: {{password}}\n\n⚠️ Please keep these credentials safe!\n\n_SuperSender Pro_", isActive: true, autoSendOnPayment: true, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "dt2", productName: "Claude Pro", credentialFields: ["email", "password", "license_key"], messageTemplate: "Assalam Alaikum {{name}}! 🎉\n\nYour *Claude Pro* is ready!\n\n📧 Email: {{email}}\n🔑 Password: {{password}}\n🗝️ Key: {{license_key}}\n\n_SuperSender Pro_", isActive: true, autoSendOnPayment: true, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "dt3", productName: "Netflix", credentialFields: ["email", "password", "profile_pin"], messageTemplate: "Netflix ready! 🍿\n\n📧 Email: {{email}}\n🔑 Password: {{password}}\n📌 Your Profile PIN: {{profile_pin}}\n\nEnjoy watching! 🎬", isActive: false, autoSendOnPayment: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

const MOCK_LOGS: DeliveryLog[] = [
  { id: "dl1", orderId: "o1", customerName: "Ahmed Khan", whatsapp: "03001234567", product: "ChatGPT Plus", credentials: { email: "user@example.com", password: "Pass123!" }, status: "sent", sentAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "dl2", orderId: "o2", customerName: "Sara Ali", whatsapp: "03111234567", product: "Claude Pro", credentials: { email: "sara@example.com", password: "SecureP@ss", license_key: "CLPRO-XXXX-YYYY" }, status: "sent", sentAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "dl3", orderId: "o3", customerName: "Bilal Raza", whatsapp: "03211234567", product: "Netflix", credentials: {}, status: "pending" },
];

export const getDeliveryTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_TEMPLATES);

export const getDeliveryLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_LOGS);

export const getDeliveryConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.deliveryConfig ?? DEFAULT_CONFIG) as DeliveryConfig;
  });

export const saveDeliveryTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async () => ({ ok: true }));

export const sendCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    whatsapp: z.string().min(10),
    customerName: z.string(),
    product: z.string(),
    credentials: z.record(z.string(), z.string()),
    templateId: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const template = MOCK_TEMPLATES.find(t => t.productName === data.product) ?? MOCK_TEMPLATES[0];
    let message = template?.messageTemplate ?? DEFAULT_CONFIG.defaultMessage;
    message = message.replace("{{name}}", data.customerName).replace("{{product}}", data.product);
    Object.entries(data.credentials).forEach(([k, v]) => { message = message.replace(`{{${k}}}`, v); });
    const credBlock = Object.entries(data.credentials).map(([k, v]) => `${k.replace(/_/g," ")}: ${v}`).join("\n");
    message = message.replace("{{credentials}}", credBlock);

    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (token && phoneId) {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g, ""), type: "text", text: { body: message } }),
      });
    }
    return { ok: true, demo: !token, messageSent: message };
  });

export const saveDeliveryConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, deliveryConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });
