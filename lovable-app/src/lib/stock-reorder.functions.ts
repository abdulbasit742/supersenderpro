import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface StockItem {
  id: string;
  productName: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  maxStock: number;
  reorderQuantity: number;
  supplierName?: string;
  supplierWhatsapp?: string;
  supplierEmail?: string;
  unitCost: number;
  lastRestockAt?: string;
  autoReorder: boolean;
  status: "in_stock" | "low_stock" | "out_of_stock" | "reordering";
}

export interface ReorderLog {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplierName?: string;
  method: "whatsapp" | "email" | "manual";
  status: "sent" | "confirmed" | "received" | "cancelled";
  sentAt: string;
}

const MOCK_STOCK: StockItem[] = [
  { id: "s1", productName: "ChatGPT Plus", category: "AI Tools", currentStock: 5, minThreshold: 10, maxStock: 50, reorderQuantity: 30, supplierName: "Tech Resellers PK", supplierWhatsapp: "03001234567", unitCost: 3800, lastRestockAt: new Date(Date.now() - 7 * 86400000).toISOString(), autoReorder: true, status: "low_stock" },
  { id: "s2", productName: "Claude Pro", category: "AI Tools", currentStock: 0, minThreshold: 5, maxStock: 30, reorderQuantity: 20, supplierName: "Digital Hub", supplierWhatsapp: "03111234567", unitCost: 2900, lastRestockAt: new Date(Date.now() - 3 * 86400000).toISOString(), autoReorder: true, status: "out_of_stock" },
  { id: "s3", productName: "LinkedIn Premium", category: "Professional", currentStock: 25, minThreshold: 5, maxStock: 40, reorderQuantity: 20, supplierName: "ProTools PK", supplierWhatsapp: "03211234567", unitCost: 4200, autoReorder: false, status: "in_stock" },
  { id: "s4", productName: "Midjourney Basic", category: "Creative", currentStock: 12, minThreshold: 8, maxStock: 35, reorderQuantity: 20, supplierName: "Creative Accounts", supplierWhatsapp: "03321234567", unitCost: 2600, autoReorder: true, status: "in_stock" },
];

const MOCK_LOGS: ReorderLog[] = [
  { id: "rl1", productId: "s2", productName: "Claude Pro", quantity: 20, unitCost: 2900, totalCost: 58000, supplierName: "Digital Hub", method: "whatsapp", status: "sent", sentAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "rl2", productId: "s1", productName: "ChatGPT Plus", quantity: 30, unitCost: 3800, totalCost: 114000, supplierName: "Tech Resellers PK", method: "whatsapp", status: "confirmed", sentAt: new Date(Date.now() - 86400000).toISOString() },
];

export const getStockItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_STOCK);

export const getReorderLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_LOGS);

export const saveStockItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data }) => ({ ok: true, id: data.id ?? `s_${Date.now()}` }));

export const triggerReorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ stockItemId: z.string(), quantity: z.number().positive().optional() }).parse(d))
  .handler(async ({ data }) => {
    const item = MOCK_STOCK.find(s => s.id === data.stockItemId);
    if (!item) throw new Error("Stock item not found");
    const qty = data.quantity ?? item.reorderQuantity;
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (item.supplierWhatsapp && token && phoneId) {
      const msg = `Assalam Alaikum! 🙏\n\nPlease arrange *${qty}x ${item.productName}*.\n\nTotal: PKR ${(qty * item.unitCost).toLocaleString()}\n\nKindly confirm availability.\n\n_SuperSender Pro_`;
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: item.supplierWhatsapp.replace(/\D/g, ""), type: "text", text: { body: msg } }) });
    }
    return { ok: true, demo: !token, quantity: qty, product: item.productName, totalCost: qty * item.unitCost };
  });
