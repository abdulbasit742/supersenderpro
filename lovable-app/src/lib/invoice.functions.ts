import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export interface InvoiceItem {
  name: string;
  plan?: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  orderId?: string;
  customerId?: string;
  customerName?: string;
  whatsapp?: string;
  address?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  status: "draft" | "sent" | "paid";
  notes?: string;
  issuedAt: string;
  dueAt: string;
}

export interface InvoiceConfig {
  businessName: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  logoUrl?: string;
  taxRate: number;
  defaultDueDays: number;
  footer: string;
}

const DEFAULT_INVOICE_CONFIG: InvoiceConfig = {
  businessName: "SuperSender Pro",
  taxRate: 0,
  defaultDueDays: 3,
  footer: "Thank you for your business! 🙏",
};

function generateInvoiceNo(): string {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function renderInvoiceHTML(invoice: Invoice, config: InvoiceConfig): string {
  const rows = invoice.items.map((it) => `<tr><td>${it.name}${it.plan ? ` (${it.plan})` : ""}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">PKR ${it.unitPrice.toLocaleString()}</td><td style="text-align:right">PKR ${it.total.toLocaleString()}</td></tr>`).join("");
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#1a1a1a;font-size:14px}
.header{display:flex;justify-content:space-between;margin-bottom:32px}
.biz-name{font-size:24px;font-weight:bold;color:#6366f1}
.invoice-no{font-size:18px;font-weight:bold}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.section-label{font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#f3f4f6;text-align:left;padding:10px 12px;font-size:12px;text-transform:uppercase;color:#6b7280}
td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
.totals{margin-left:auto;width:300px}
.totals tr td:first-child{color:#6b7280}
.totals tr td:last-child{text-align:right;font-weight:500}
.grand-total td{font-size:18px;font-weight:bold;color:#6366f1;border-top:2px solid #6366f1}
.footer{margin-top:32px;text-align:center;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.badge-paid{background:#d1fae5;color:#065f46}
.badge-sent{background:#dbeafe;color:#1e40af}
.badge-draft{background:#f3f4f6;color:#374151}
</style></head>
<body>
<div class="header">
  <div><div class="biz-name">${config.businessName}</div>${config.businessPhone ? `<div>${config.businessPhone}</div>` : ""}${config.businessEmail ? `<div>${config.businessEmail}</div>` : ""}${config.businessAddress ? `<div>${config.businessAddress}</div>` : ""}</div>
  <div style="text-align:right"><div class="invoice-no">${invoice.invoiceNo}</div><div style="color:#6b7280;margin-top:4px">Issued: ${new Date(invoice.issuedAt).toLocaleDateString()}</div><div style="color:#6b7280">Due: ${new Date(invoice.dueAt).toLocaleDateString()}</div><div style="margin-top:8px"><span class="badge badge-${invoice.status}">${invoice.status.toUpperCase()}</span></div></div>
</div>
<div class="info-grid">
  <div><div class="section-label">Bill To</div><div style="font-weight:600">${invoice.customerName ?? "Customer"}</div>${invoice.whatsapp ? `<div>${invoice.whatsapp}</div>` : ""}${invoice.address ? `<div>${invoice.address}</div>` : ""}</div>
</div>
<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<table class="totals">
  <tr><td>Subtotal</td><td>PKR ${invoice.subtotal.toLocaleString()}</td></tr>
  ${invoice.discount > 0 ? `<tr><td>Discount</td><td>-PKR ${invoice.discount.toLocaleString()}</td></tr>` : ""}
  ${invoice.tax > 0 ? `<tr><td>Tax</td><td>PKR ${invoice.tax.toLocaleString()}</td></tr>` : ""}
  <tr class="grand-total"><td>TOTAL</td><td>PKR ${invoice.total.toLocaleString()}</td></tr>
</table>
${invoice.paymentMethod ? `<p><strong>Payment Method:</strong> ${invoice.paymentMethod}</p>` : ""}
${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
<div class="footer">${config.footer}</div>
</body></html>`;
}

export const getInvoiceConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.invoiceConfig ?? DEFAULT_INVOICE_CONFIG) as InvoiceConfig;
  });

export const saveInvoiceConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, invoiceConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    orderId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    customerName: z.string().optional(),
    whatsapp: z.string().optional(),
    items: z.array(z.object({ name: z.string(), plan: z.string().optional(), qty: z.number().int().positive(), unitPrice: z.number().nonnegative() })),
    discount: z.number().nonneg().optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: cfgRow } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const cfg = ((cfgRow?.settings as Record<string, unknown>)?.invoiceConfig ?? DEFAULT_INVOICE_CONFIG) as InvoiceConfig;

    const items: InvoiceItem[] = data.items.map((it) => ({ ...it, total: it.qty * it.unitPrice }));
    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const discount = data.discount ?? 0;
    const tax = Math.round(((subtotal - discount) * cfg.taxRate) / 100);
    const total = subtotal - discount + tax;
    const invoiceNo = generateInvoiceNo();
    const issuedAt = new Date().toISOString();
    const dueAt = new Date(Date.now() + cfg.defaultDueDays * 86400000).toISOString();

    const payload: Record<string, unknown> = { user_id: userId, invoice_no: invoiceNo, order_id: data.orderId, customer_id: data.customerId, customer_name: data.customerName, whatsapp: data.whatsapp, items, subtotal, discount, tax, total, payment_method: data.paymentMethod, notes: data.notes, status: "draft", issued_at: issuedAt, due_at: dueAt };
    const { data: inv } = await db.from("invoices").insert(payload).select().single();
    await logAuditEvent({ data: { action: `Invoice created: ${invoiceNo}`, targetType: "invoice", severity: "success" } });
    const r = inv as Record<string, unknown>;
    return { id: String(r.id), invoiceNo, orderId: data.orderId, customerId: data.customerId, customerName: data.customerName, whatsapp: data.whatsapp, items, subtotal, discount, tax, total, paymentMethod: data.paymentMethod, notes: data.notes, status: "draft", issuedAt, dueAt } as Invoice;
  });

export const getInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("invoices").select("*").eq("user_id", userId).order("issued_at", { ascending: false }).limit(100);
    return (data ?? []) as Record<string, unknown>[];
  });

export const sendInvoiceViaWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ invoiceId: z.string(), whatsapp: z.string().min(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: inv } = await db.from("invoices").select("*").eq("id", data.invoiceId).eq("user_id", userId).single();
    if (!inv) throw new Error("Invoice not found");
    const r = inv as Record<string, unknown>;
    const msg = `🧾 *Invoice ${String(r.invoice_no)}*\n\nAmount: *PKR ${Number(r.total).toLocaleString()}*\nStatus: ${String(r.status)}\nDue: ${new Date(String(r.due_at)).toLocaleDateString()}\n\n_SuperSender Pro_`;
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (!token || !phoneId) { await db.from("invoices").update({ status: "sent" }).eq("id", data.invoiceId); return { ok: true, demo: true }; }
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g, ""), type: "text", text: { body: msg } }) });
    if (!res.ok) { const e = await res.text(); throw new Error(`WA send failed: ${e}`); }
    await db.from("invoices").update({ status: "sent" }).eq("id", data.invoiceId);
    await logAuditEvent({ data: { action: `Invoice ${String(r.invoice_no)} sent via WhatsApp`, targetType: "invoice", severity: "success" } });
    return { ok: true };
  });
