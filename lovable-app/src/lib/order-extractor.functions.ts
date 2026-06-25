import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export interface ExtractedOrder {
  customerName?: string;
  whatsapp?: string;
  product?: string;
  quantity?: number;
  price?: number;
  address?: string;
  paymentMethod?: string;
  notes?: string;
  confidence: number;
  rawMessage: string;
}

export interface ExtractorLog {
  id: string;
  rawMessage: string;
  extracted: ExtractedOrder;
  orderId?: string;
  status: "pending" | "confirmed" | "rejected";
  createdAt: string;
}

export const extractOrderFromMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      // Fallback: basic regex extraction without AI
      return basicExtract(data.message);
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an order extraction AI for a Pakistani WhatsApp business. Extract order details from the message. Return JSON with fields: customerName (string|null), whatsapp (string|null, 11 digits Pakistani number), product (string|null), quantity (number|null), price (number|null, PKR), address (string|null), paymentMethod (string|null: jazzcash/easypaisa/bank/cash), notes (string|null), confidence (0-100 integer). If a field is not found, use null. WhatsApp numbers: normalize to 03XXXXXXXXX format.`,
          },
          { role: "user", content: data.message },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) return basicExtract(data.message);

    const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = j.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return {
        customerName: parsed.customerName as string | undefined,
        whatsapp: parsed.whatsapp as string | undefined,
        product: parsed.product as string | undefined,
        quantity: parsed.quantity as number | undefined,
        price: parsed.price as number | undefined,
        address: parsed.address as string | undefined,
        paymentMethod: parsed.paymentMethod as string | undefined,
        notes: parsed.notes as string | undefined,
        confidence: Number(parsed.confidence ?? 70),
        rawMessage: data.message,
      } as ExtractedOrder;
    } catch {
      return basicExtract(data.message);
    }
  });

function basicExtract(message: string): ExtractedOrder {
  const waMatch = message.match(/(?:0|92)3\d{9}/);
  const priceMatch = message.match(/(?:PKR|Rs\.?|rupees?)?\s*(\d{3,6})/i);
  const qtyMatch = message.match(/(\d+)\s*(?:pcs?|pieces?|qty|quantity|nos?\.?)/i);
  const products = ["ChatGPT", "Claude", "SSD", "RAM", "Laptop", "Keyboard", "Mouse", "Almonds", "Cashew", "Shirt", "Pizza"];
  const foundProduct = products.find((p) => message.toLowerCase().includes(p.toLowerCase()));
  const paymentMethods = ["jazzcash", "easypaisa", "bank", "cash"];
  const foundPayment = paymentMethods.find((m) => message.toLowerCase().includes(m));

  return {
    whatsapp: waMatch ? waMatch[0] : undefined,
    price: priceMatch ? Number(priceMatch[1]) : undefined,
    quantity: qtyMatch ? Number(qtyMatch[1]) : 1,
    product: foundProduct,
    paymentMethod: foundPayment,
    confidence: 45,
    rawMessage: message,
  };
}

export const confirmExtractedOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    extracted: z.object({
      customerName: z.string().optional(),
      whatsapp: z.string().optional(),
      product: z.string().optional(),
      quantity: z.number().optional(),
      price: z.number().optional(),
      notes: z.string().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let customerId: string | null = null;
    if (data.extracted.whatsapp) {
      const { data: existing } = await supabase.from("customers")
        .select("id").eq("whatsapp", data.extracted.whatsapp).eq("user_id", userId).single();
      if (existing) {
        customerId = existing.id;
      } else if (data.extracted.customerName || data.extracted.whatsapp) {
        const { data: created } = await supabase.from("customers")
          .insert({ user_id: userId, name: data.extracted.customerName ?? data.extracted.whatsapp ?? "Unknown", whatsapp: data.extracted.whatsapp }).select("id").single();
        customerId = created?.id ?? null;
      }
    }

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: userId,
      customer_id: customerId,
      tool: data.extracted.product ?? "Unknown",
      plan: "Standard",
      sell_price: data.extracted.price ?? 0,
      quantity: data.extracted.quantity ?? 1,
      status: "pending",
      source: "extractor",
      notes: data.extracted.notes,
    }).select("id").single();

    if (error) throw new Error(error.message);
    await logAuditEvent({ data: { action: "Order created via AI extractor", target: order?.id, targetType: "order", severity: "success" } });
    return { ok: true, orderId: order?.id };
  });

export const getExtractorLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("orders")
      .select("id, tool, sell_price, status, created_at, notes")
      .eq("user_id", userId).eq("source", "extractor")
      .order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });
