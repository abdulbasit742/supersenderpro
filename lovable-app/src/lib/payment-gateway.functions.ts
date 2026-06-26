import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type GatewayProvider = "jazzcash" | "easypaisa" | "stripe" | "payfast" | "manual";

export interface PaymentGatewayConfig {
  provider: GatewayProvider;
  isActive: boolean;
  merchantId?: string;
  apiKey?: string;
  secretKey?: string;
  accountNumber?: string;
  accountTitle?: string;
  webhookUrl?: string;
  autoConfirm: boolean;
  sendReceiptOnSuccess: boolean;
  receiptMessage: string;
}

export interface PaymentLink {
  id: string;
  customerId: string;
  customerName: string;
  whatsapp: string;
  amount: number;
  description: string;
  provider: GatewayProvider;
  status: "pending" | "paid" | "expired" | "cancelled";
  link: string;
  createdAt: string;
  paidAt?: string;
  expiresAt: string;
}

const MOCK_CONFIG: PaymentGatewayConfig = { provider: "jazzcash", isActive: true, merchantId: "MC12345", apiKey: "ak_live_****", secretKey: "sk_live_****", accountNumber: "03001234567", accountTitle: "SuperSender Pro", webhookUrl: "https://supersenderpro.com/webhooks/payment", autoConfirm: false, sendReceiptOnSuccess: true, receiptMessage: "✅ Payment received! PKR {{amount}} confirmed. Shukriya {{name}} — aapka order process ho raha hai!" };
function makeLink(i: number): PaymentLink {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik"];
  const amounts = [3500,2500,1800,4200,5500];
  const statuses: PaymentLink["status"][] = ["pending","paid","pending","paid","expired"];
  const d = new Date(); d.setDate(d.getDate() - i);
  const exp = new Date(d); exp.setDate(exp.getDate() + 3);
  return { id: `pl${i+1}`, customerId: `c${i+1}`, customerName: names[i], whatsapp: `030${i}1234567`, amount: amounts[i], description: `Payment for order #ORD-${4500-i}`, provider: "jazzcash", status: statuses[i], link: `https://pay.jazzcash.com.pk/link/${Math.random().toString(36).slice(2,10)}`, createdAt: d.toISOString(), paidAt: statuses[i]==="paid" ? new Date(d.getTime()+3600000).toISOString() : undefined, expiresAt: exp.toISOString() };
}
const MOCK_LINKS: PaymentLink[] = Array.from({ length: 5 }, (_, i) => makeLink(i));

export const getPaymentGatewayConfig = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_CONFIG);
export const savePaymentGatewayConfig = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.record(z.unknown())).handler(async ({ data }) => ({ success: true, ...data }));
export const getPaymentLinks = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_LINKS);
export const createPaymentLink = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ customerId: z.string(), customerName: z.string(), whatsapp: z.string(), amount: z.number(), description: z.string(), provider: z.string() })).handler(async ({ data }) => ({ success: true, id: `pl_${Date.now()}`, link: `https://pay.jazzcash.com.pk/link/${Math.random().toString(36).slice(2,10)}`, ...data }));
export const sendPaymentLink = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ linkId: z.string() })).handler(async () => ({ success: true, note: "Demo: Payment link sent via WhatsApp" }));
export const markPaid = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ linkId: z.string() })).handler(async ({ data }) => ({ success: true, linkId: data.linkId, paidAt: new Date().toISOString() }));
