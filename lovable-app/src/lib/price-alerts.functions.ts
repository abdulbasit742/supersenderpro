import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface PriceAlert {
  id: string;
  customerId: string;
  customerName: string;
  whatsapp: string;
  product: string;
  targetPrice: number;
  currentPrice: number;
  status: "watching" | "triggered" | "expired";
  notified: boolean;
  notifiedAt?: string;
  createdAt: string;
  expiresAt: string;
}

export interface PriceAlertConfig {
  isActive: boolean;
  checkIntervalHours: number;
  alertMessage: string;
  maxAlertsPerDay: number;
}

const MOCK_ALERTS: PriceAlert[] = [
  { id: "pa1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", product: "ChatGPT Plus", targetPrice: 3000, currentPrice: 3500, status: "watching", notified: false, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 23 * 86400000).toISOString() },
  { id: "pa2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", product: "Adobe CC", targetPrice: 4000, currentPrice: 3800, status: "triggered", notified: true, notifiedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 16 * 86400000).toISOString() },
  { id: "pa3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", product: "Midjourney Pro", targetPrice: 3500, currentPrice: 4200, status: "watching", notified: false, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 27 * 86400000).toISOString() },
  { id: "pa4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", product: "Netflix Premium", targetPrice: 2000, currentPrice: 2500, status: "watching", notified: false, createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 29 * 86400000).toISOString() },
];

const MOCK_CONFIG: PriceAlertConfig = { isActive: true, checkIntervalHours: 6, alertMessage: "🎉 Khushkhabri! {{product}} ki price aapke target price {{targetPrice}} tak aa gayi hai!\n\nAbhi order karein: Reply YES to proceed\n\n_SuperSender Pro_", maxAlertsPerDay: 3 };

export const getPriceAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_ALERTS);

export const getPriceAlertConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_CONFIG);

export const savePriceAlertConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.record(z.unknown()))
  .handler(async ({ data }) => ({ success: true, ...data }));

export const createPriceAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ customerId: z.string(), whatsapp: z.string(), product: z.string(), targetPrice: z.number() }))
  .handler(async ({ data }) => ({ success: true, id: `pa_${Date.now()}`, ...data, status: "watching" }));

export const sendAlertNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ alertId: z.string() }))
  .handler(async () => ({ success: true, note: "Demo: Price alert sent via WhatsApp" }));
