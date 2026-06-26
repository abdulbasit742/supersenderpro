import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type RefundStatus = "pending" | "under_review" | "approved" | "rejected" | "processed";
export type RefundReason = "wrong_product" | "not_working" | "duplicate_order" | "changed_mind" | "quality_issue" | "other";

export interface RefundRequest {
  id: string;
  refundNo: string;
  customerName: string;
  whatsapp: string;
  orderId: string;
  product: string;
  originalAmount: number;
  refundAmount: number;
  reason: RefundReason;
  description: string;
  status: RefundStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  agentNote?: string;
  paymentMethod?: string;
}

const MOCK_REFUNDS: RefundRequest[] = [
  { id: "rf1", refundNo: "RFD-001", customerName: "Ahmed Khan", whatsapp: "03001234567", orderId: "ORD-4521", product: "ChatGPT Plus", originalAmount: 3500, refundAmount: 3500, reason: "not_working", description: "Account access issue, credentials not working since 2 days", status: "pending", createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "rf2", refundNo: "RFD-002", customerName: "Sara Ali", whatsapp: "03111234567", orderId: "ORD-4489", product: "Netflix Premium", originalAmount: 2500, refundAmount: 2500, reason: "duplicate_order", description: "Paid twice by mistake", status: "approved", createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(), agentNote: "Confirmed duplicate payment in records", paymentMethod: "JazzCash" },
  { id: "rf3", refundNo: "RFD-003", customerName: "Bilal Raza", whatsapp: "03211234567", orderId: "ORD-4401", product: "Canva Pro", originalAmount: 1800, refundAmount: 1800, reason: "changed_mind", description: "Don't need it anymore", status: "rejected", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(), agentNote: "Policy: no refund for change of mind after 24h", resolvedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "rf4", refundNo: "RFD-004", customerName: "Fatima Noor", whatsapp: "03321234567", orderId: "ORD-4356", product: "Adobe CC", originalAmount: 4500, refundAmount: 4500, reason: "quality_issue", description: "Account suspended by Adobe", status: "under_review", createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "rf5", refundNo: "RFD-005", customerName: "Hassan Malik", whatsapp: "03421234567", orderId: "ORD-4299", product: "Midjourney Pro", originalAmount: 4200, refundAmount: 4200, reason: "wrong_product", description: "Ordered basic but charged pro", status: "processed", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), resolvedAt: new Date(Date.now() - 2 * 86400000).toISOString(), paymentMethod: "Bank Transfer" },
];

export const getRefunds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ status: z.string().optional() }))
  .handler(async ({ data }) => data.status && data.status !== "all" ? MOCK_REFUNDS.filter(r => r.status === data.status) : MOCK_REFUNDS);

export const updateRefundStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ refundId: z.string(), status: z.string(), agentNote: z.string().optional(), paymentMethod: z.string().optional(), notifyCustomer: z.boolean().optional() }))
  .handler(async ({ data }) => ({ success: true, refundId: data.refundId, status: data.status, note: data.notifyCustomer ? "Customer notified via WhatsApp" : undefined }));

export const createRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ customerName: z.string(), whatsapp: z.string(), orderId: z.string(), product: z.string(), originalAmount: z.number(), reason: z.string(), description: z.string() }))
  .handler(async ({ data }) => ({ success: true, refundNo: `RFD-${String(Date.now()).slice(-4)}`, id: `rf_${Date.now()}`, ...data }));
