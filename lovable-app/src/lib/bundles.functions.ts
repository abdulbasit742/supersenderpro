import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface BundleItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  items: BundleItem[];
  originalTotal: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
  isActive: boolean;
  totalSold: number;
  totalRevenue: number;
  createdAt: string;
}

const MOCK_BUNDLES: Bundle[] = [
  { id: "bn1", name: "Creator Pack", description: "ChatGPT + Midjourney + Canva Pro — complete creative toolkit!", items: [{ productName: "ChatGPT Plus", quantity: 1, unitPrice: 3500 }, { productName: "Midjourney Pro", quantity: 1, unitPrice: 4200 }, { productName: "Canva Pro", quantity: 1, unitPrice: 1800 }], originalTotal: 9500, bundlePrice: 7500, savings: 2000, savingsPercent: 21, isActive: true, totalSold: 34, totalRevenue: 255000, createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "bn2", name: "Streaming Bundle", description: "Netflix + Spotify + YouTube Premium — all entertainment!", items: [{ productName: "Netflix Premium", quantity: 1, unitPrice: 2500 }, { productName: "Spotify Family", quantity: 1, unitPrice: 1200 }, { productName: "YouTube Premium", quantity: 1, unitPrice: 900 }], originalTotal: 4600, bundlePrice: 3800, savings: 800, savingsPercent: 17, isActive: true, totalSold: 67, totalRevenue: 254600, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "bn3", name: "Business Starter", description: "LinkedIn + Grammarly + Adobe CC — for professionals!", items: [{ productName: "LinkedIn Premium", quantity: 1, unitPrice: 4500 }, { productName: "Grammarly Pro", quantity: 1, unitPrice: 1500 }, { productName: "Adobe CC", quantity: 1, unitPrice: 5500 }], originalTotal: 11500, bundlePrice: 9000, savings: 2500, savingsPercent: 22, isActive: false, totalSold: 12, totalRevenue: 108000, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

export const getBundles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_BUNDLES);

export const saveBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().optional(), name: z.string(), description: z.string(), items: z.array(z.object({ productName: z.string(), quantity: z.number(), unitPrice: z.number() })), bundlePrice: z.number(), isActive: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const originalTotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const savings = originalTotal - data.bundlePrice;
    return { success: true, id: data.id ?? `bn_${Date.now()}`, originalTotal, savings, savingsPercent: Math.round((savings / originalTotal) * 100) };
  });

export const toggleBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ bundleId: z.string(), isActive: z.boolean() }))
  .handler(async ({ data }) => ({ success: true, ...data }));

export const promoteBundleViaWA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ bundleId: z.string(), targetSegment: z.string() }))
  .handler(async ({ data }) => {
    const bundle = MOCK_BUNDLES.find(b => b.id === data.bundleId);
    return { success: true, sent: 456, bundleName: bundle?.name ?? "", note: "Demo: Bundle promotion sent to segment" };
  });
