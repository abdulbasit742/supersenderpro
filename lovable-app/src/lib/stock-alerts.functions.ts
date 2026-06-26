import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface StockArrivalAlert {
  id: string;
  productName: string;
  stockAdded: number;
  notifyWaitlist: boolean;
  notifyAll: boolean;
  targetSegment: string;
  messageTemplate: string;
  autoSend: boolean;
  sentCount?: number;
  sentAt?: string;
  status: "pending" | "sent" | "draft";
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  productName: string;
  customerName: string;
  whatsapp: string;
  requestedAt: string;
  notified: boolean;
}

const MOCK_ALERTS: StockArrivalAlert[] = [
  { id: "sa1", productName: "ChatGPT Plus", stockAdded: 50, notifyWaitlist: true, notifyAll: false, targetSegment: "waitlist", messageTemplate: "🎉 Khush khabri! *{{product}}* ka naya stock aa gaya!\n\nSirf *{{qty}} slots* available hain.\n\nAbhi order karein before stock khatam ho! Reply: YES", autoSend: true, sentCount: 23, sentAt: new Date(Date.now() - 86400000).toISOString(), status: "sent", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "sa2", productName: "Adobe CC", stockAdded: 20, notifyWaitlist: true, notifyAll: true, targetSegment: "all", messageTemplate: "🆕 *{{product}}* stock available!\n\nLimited slots — PKR {{price}}\n\nFirst come first serve! Reply: BUY", autoSend: false, status: "draft", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "sa3", productName: "Midjourney Pro", stockAdded: 10, notifyWaitlist: true, notifyAll: false, targetSegment: "waitlist", messageTemplate: "⚡ *{{product}}* stock back! {{qty}} slots. Quick reply: YES", autoSend: true, sentCount: 8, sentAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: "sent", createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
];

const MOCK_WAITLIST: WaitlistEntry[] = [
  { id: "wl1", productName: "ChatGPT Plus", customerName: "Ahmed Khan", whatsapp: "03001234567", requestedAt: new Date(Date.now() - 3 * 86400000).toISOString(), notified: true },
  { id: "wl2", productName: "Adobe CC", customerName: "Sara Ali", whatsapp: "03111234567", requestedAt: new Date(Date.now() - 2 * 86400000).toISOString(), notified: false },
  { id: "wl3", productName: "Adobe CC", customerName: "Bilal Raza", whatsapp: "03211234567", requestedAt: new Date(Date.now() - 86400000).toISOString(), notified: false },
  { id: "wl4", productName: "Midjourney Pro", customerName: "Fatima Noor", whatsapp: "03321234567", requestedAt: new Date(Date.now() - 4 * 86400000).toISOString(), notified: true },
  { id: "wl5", productName: "Spotify Family", customerName: "Hassan Malik", whatsapp: "03421234567", requestedAt: new Date(Date.now() - 5 * 86400000).toISOString(), notified: false },
];

export const getStockAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_ALERTS);

export const getWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_WAITLIST);

export const createStockAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productName: z.string(), stockAdded: z.number(), notifyWaitlist: z.boolean(), notifyAll: z.boolean(), messageTemplate: z.string(), autoSend: z.boolean() }))
  .handler(async ({ data }) => ({ success: true, id: `sa_${Date.now()}`, ...data, status: data.autoSend ? "sent" : "draft" }));

export const sendStockAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ alertId: z.string() }))
  .handler(async ({ data }) => {
    const alert = MOCK_ALERTS.find(a => a.id === data.alertId);
    return { success: true, sent: alert?.notifyAll ? 234 : 12, note: "Demo: Stock alert sent to waitlist" };
  });

export const addToWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productName: z.string(), customerName: z.string(), whatsapp: z.string() }))
  .handler(async ({ data }) => ({ success: true, id: `wl_${Date.now()}`, ...data, requestedAt: new Date().toISOString(), notified: false }));
