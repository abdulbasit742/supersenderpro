import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

const META_BASE = "https://graph.facebook.com/v21.0";
function metaHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export interface WACatalogProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  url?: string;
  availability: "in stock" | "out of stock" | "preorder";
  condition: "new" | "refurbished" | "used";
  brand?: string;
  category?: string;
  syncStatus: "synced" | "pending" | "error" | "not_synced";
  metaProductId?: string;
}

export interface WACatalog {
  id: string;
  name: string;
  productCount: number;
  status: string;
  createdAt: string;
}

export interface WAFlow {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "DEPRECATED" | "BLOCKED" | "THROTTLED";
  categories: string[];
  previewUrl?: string;
  updatedAt: string;
}

const MOCK_PRODUCTS: WACatalogProduct[] = [
  { id: "1", name: "ChatGPT Plus 1 Month", description: "OpenAI ChatGPT Plus subscription for 1 month", price: 1500, currency: "PKR", availability: "in stock", condition: "new", category: "Software", syncStatus: "synced", metaProductId: "meta_001" },
  { id: "2", name: "Claude Pro 1 Month", description: "Anthropic Claude Pro subscription", price: 1800, currency: "PKR", availability: "in stock", condition: "new", category: "Software", syncStatus: "synced", metaProductId: "meta_002" },
  { id: "3", name: "Midjourney Basic", description: "Midjourney image generation plan", price: 1200, currency: "PKR", availability: "in stock", condition: "new", category: "Software", syncStatus: "pending" },
  { id: "4", name: "LinkedIn Premium 1 Month", description: "LinkedIn Career Premium", price: 2500, currency: "PKR", availability: "in stock", condition: "new", category: "Software", syncStatus: "not_synced" },
];

const MOCK_FLOWS: WAFlow[] = [
  { id: "f1", name: "Order Placement Flow", status: "PUBLISHED", categories: ["SHOPPING"], updatedAt: new Date().toISOString() },
  { id: "f2", name: "Subscription Renewal", status: "PUBLISHED", categories: ["ACCOUNT_UPDATES"], updatedAt: new Date().toISOString() },
  { id: "f3", name: "Customer Support", status: "DRAFT", categories: ["CUSTOMER_SUPPORT"], updatedAt: new Date().toISOString() },
  { id: "f4", name: "Product Discovery", status: "PUBLISHED", categories: ["SHOPPING"], updatedAt: new Date().toISOString() },
];

export const getWACatalogProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: catalog } = await supabase.from("catalog").select("id, name, description, sell_price, category, image_url, meta_product_id, meta_sync_status").eq("user_id", userId).limit(100);
    if (!catalog?.length) return MOCK_PRODUCTS;
    return (catalog ?? []).map((c) => ({
      id: String(c.id), name: c.name ?? "", description: c.description as string | undefined, price: Number(c.sell_price) || 0, currency: "PKR",
      imageUrl: c.image_url as string | undefined, availability: "in stock" as const, condition: "new" as const, category: c.category as string | undefined,
      syncStatus: (c.meta_sync_status ?? "not_synced") as WACatalogProduct["syncStatus"], metaProductId: c.meta_product_id as string | undefined,
    })) as WACatalogProduct[];
  });

export const syncProductToMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: z.string(), catalogId: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: product } = await supabase.from("catalog").select("*").eq("id", data.productId).eq("user_id", userId).single();
    if (!product) throw new Error("Product not found");

    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const catalogId = data.catalogId ?? process.env.META_CATALOG_ID ?? "";
    if (!token || !catalogId) {
      await supabase.from("catalog").update({ meta_sync_status: "synced", meta_product_id: "demo_" + data.productId }).eq("id", data.productId).eq("user_id", userId);
      return { ok: true, demo: true };
    }

    const body = { retailer_id: product.id, name: product.name, description: product.description ?? "", price: Math.round((Number(product.sell_price) || 0) * 100), currency: "PKR", availability: "in stock", condition: "new", image_url: product.image_url ?? "" };
    const r = await fetch(`${META_BASE}/${catalogId}/products`, { method: "POST", headers: metaHeaders(token), body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.text(); throw new Error(`Catalog sync failed: ${e}`); }
    const j = await r.json() as { id?: string };
    await supabase.from("catalog").update({ meta_sync_status: "synced", meta_product_id: j.id }).eq("id", data.productId).eq("user_id", userId);
    await logAuditEvent({ data: { action: `Product synced to Meta catalog: ${product.name}`, targetType: "wa_catalog", severity: "success" } });
    return { ok: true, metaProductId: j.id };
  });

export const syncAllProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ catalogId: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: products } = await supabase.from("catalog").select("id").eq("user_id", userId);
    let synced = 0; let failed = 0;
    for (const p of (products ?? [])) {
      try {
        const { syncProductToMeta: syncFn } = await import("@/lib/wa-catalog.functions");
        await syncFn({ data: { productId: p.id, catalogId: data.catalogId } });
        synced++;
      } catch { failed++; }
    }
    await logAuditEvent({ data: { action: `Bulk catalog sync: ${synced} synced, ${failed} failed`, targetType: "wa_catalog", severity: synced > 0 ? "success" : "error" } });
    return { ok: true, synced, failed };
  });

export const getWAFlows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const wabaId = process.env.META_WABA_ID ?? "";
    if (!token || !wabaId) return MOCK_FLOWS;
    const r = await fetch(`${META_BASE}/${wabaId}/flows?fields=id,name,status,categories,preview,updated_at`, { headers: metaHeaders(token) });
    if (!r.ok) return MOCK_FLOWS;
    const j = await r.json() as { data?: Record<string, unknown>[] };
    return (j.data ?? MOCK_FLOWS).map((f) => ({
      id: String(f.id), name: String(f.name ?? ""), status: (f.status ?? "DRAFT") as WAFlow["status"],
      categories: (f.categories as string[]) ?? [], previewUrl: (f.preview as Record<string, unknown>)?.preview_url as string | undefined,
      updatedAt: String(f.updated_at ?? new Date().toISOString()),
    })) as WAFlow[];
  });

export const publishWAFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ flowId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    if (!token) return { ok: true, demo: true };
    const r = await fetch(`${META_BASE}/${data.flowId}/publish`, { method: "POST", headers: metaHeaders(token) });
    if (!r.ok) { const e = await r.text(); throw new Error(`Publish failed: ${e}`); }
    await logAuditEvent({ data: { action: `WA Flow published: ${data.flowId}`, targetType: "wa_flow", severity: "success" } });
    return { ok: true };
  });

export type { WAFlow };
