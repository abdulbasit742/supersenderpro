import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface QRLink {
  id: string;
  label: string;
  type: "whatsapp" | "catalog" | "payment" | "custom";
  whatsappNumber?: string;
  prefilledMessage?: string;
  customUrl?: string;
  finalUrl: string;
  qrDataUrl?: string;
  shortCode: string;
  clicks: number;
  createdAt: string;
}

export interface WAClickLink {
  number: string;
  message?: string;
  url: string;
}

function buildWALink(number: string, message?: string): string {
  const clean = number.replace(/\D/g, "");
  if (message) return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${clean}`;
}

function buildQRApiUrl(data: string, size: number = 200, color: string = "000000"): string {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&color=${color}&bgcolor=ffffff&format=png`;
}

export const generateWALink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    number: z.string().min(10).max(15),
    message: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const url = buildWALink(data.number, data.message);
    const qrUrl = buildQRApiUrl(url);
    return { url, qrUrl } as WAClickLink & { qrUrl: string };
  });

export const saveQRLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    label: z.string().min(1).max(100),
    type: z.enum(["whatsapp", "catalog", "payment", "custom"]),
    whatsappNumber: z.string().optional(),
    prefilledMessage: z.string().max(1000).optional(),
    customUrl: z.string().url().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    let finalUrl = data.customUrl ?? "";
    if (data.type === "whatsapp" && data.whatsappNumber) finalUrl = buildWALink(data.whatsappNumber, data.prefilledMessage);
    const qrDataUrl = buildQRApiUrl(finalUrl);
    const payload: Record<string, unknown> = { user_id: userId, label: data.label, type: data.type, whatsapp_number: data.whatsappNumber, prefilled_message: data.prefilledMessage, custom_url: data.customUrl, final_url: finalUrl, qr_data_url: qrDataUrl, short_code: shortCode, clicks: 0, created_at: new Date().toISOString() };
    const { data: r } = await db.from("qr_links").insert(payload).select().single();
    return r as QRLink;
  });

export const getQRLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("qr_links").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []) as QRLink[];
  });

export const deleteQRLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("qr_links").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const generateBulkQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    products: z.array(z.object({ name: z.string(), price: z.number(), whatsapp: z.string() })),
  }).parse(d))
  .handler(async ({ data }) => {
    return data.products.map((p) => {
      const msg = `Hi! I'm interested in *${p.name}* at PKR ${p.price.toLocaleString()}. Please confirm availability.`;
      const url = buildWALink(p.whatsapp, msg);
      return { product: p.name, url, qrUrl: buildQRApiUrl(url, 150) };
    });
  });
