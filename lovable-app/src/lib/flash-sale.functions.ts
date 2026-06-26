import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface FlashSale {
  id: string;
  title: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  originalPrice: number;
  salePrice: number;
  productName: string;
  startAt: string;
  endAt: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
  blastSent: boolean;
  blastSentAt?: string;
  targetSegment: string;
  totalRecipients: number;
  totalClaims: number;
  totalRevenue: number;
  createdAt: string;
}

const MOCK_SALES: FlashSale[] = [
  { id: "fs1", title: "Eid Special — ChatGPT Flash", description: "Sirf 4 ghantay ke liye ChatGPT Plus at lowest price!", discountType: "percent", discountValue: 30, originalPrice: 3500, salePrice: 2450, productName: "ChatGPT Plus 1 Month", startAt: new Date(Date.now() - 3600000).toISOString(), endAt: new Date(Date.now() + 3 * 3600000).toISOString(), status: "active", blastSent: true, blastSentAt: new Date(Date.now() - 3600000).toISOString(), targetSegment: "All Customers", totalRecipients: 1243, totalClaims: 87, totalRevenue: 213150, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "fs2", title: "Midnight Deal — Netflix Premium", description: "Midnight flash sale — claim before 2 AM!", discountType: "fixed", discountValue: 500, originalPrice: 2500, salePrice: 2000, productName: "Netflix Premium 1 Month", startAt: new Date(Date.now() + 2 * 3600000).toISOString(), endAt: new Date(Date.now() + 6 * 3600000).toISOString(), status: "scheduled", blastSent: false, targetSegment: "VIP Customers", totalRecipients: 234, totalClaims: 0, totalRevenue: 0, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "fs3", title: "Weekend Sale — Canva Pro", description: "Weekend special for design lovers!", discountType: "percent", discountValue: 20, originalPrice: 1800, salePrice: 1440, productName: "Canva Pro Annual", startAt: new Date(Date.now() - 2 * 86400000).toISOString(), endAt: new Date(Date.now() - 86400000).toISOString(), status: "ended", blastSent: true, blastSentAt: new Date(Date.now() - 2 * 86400000).toISOString(), targetSegment: "All Customers", totalRecipients: 1243, totalClaims: 156, totalRevenue: 224640, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
];

export const getFlashSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase, user } = context;
      const { data, error } = await (supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Record<string, unknown>>)
        .from("flash_sales").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error || !data?.length) return MOCK_SALES;
      return data as unknown as FlashSale[];
    } catch { return MOCK_SALES; }
  });

export const saveFlashSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().optional(), title: z.string(), description: z.string(), discountType: z.enum(["percent", "fixed"]), discountValue: z.number(), originalPrice: z.number(), productName: z.string(), startAt: z.string(), endAt: z.string(), targetSegment: z.string() }))
  .handler(async ({ data }) => ({ success: true, id: data.id ?? `fs_${Date.now()}`, ...data }));

export const blastFlashSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ saleId: z.string() }))
  .handler(async ({ data }) => {
    const sale = MOCK_SALES.find(s => s.id === data.saleId);
    if (!sale) throw new Error("Sale not found");
    return { success: true, messagesSent: sale.totalRecipients, note: "Demo: WhatsApp blast queued for all recipients" };
  });

export const cancelFlashSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ saleId: z.string() }))
  .handler(async () => ({ success: true }));
