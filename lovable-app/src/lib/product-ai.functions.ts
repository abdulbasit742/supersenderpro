import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContentType = "whatsapp_post" | "instagram_caption" | "product_description" | "sales_message" | "broadcast";

export interface GeneratedContent {
  type: ContentType;
  text: string;
  hashtags?: string[];
  emojis?: string[];
  wordCount: number;
}

export interface BulkImportOrder {
  customerName?: string;
  whatsapp?: string;
  product?: string;
  plan?: string;
  quantity?: number;
  price?: number;
  paymentMethod?: string;
  notes?: string;
  valid: boolean;
  error?: string;
}

const CONTENT_PROMPTS: Record<ContentType, string> = {
  whatsapp_post: "Write a WhatsApp broadcast message to announce this product to customers. Keep it short (under 150 words), conversational, use emojis naturally, include price. Language: mix of English and commonly used Urdu words (like 'bhai', 'acha', etc.).",
  instagram_caption: "Write an Instagram caption for this product. Include 20-25 relevant hashtags at the end. Engaging, trendy, use emojis. Under 200 words.",
  product_description: "Write a professional product description. Features, benefits, who it's for. 100-150 words, clear and persuasive.",
  sales_message: "Write a personalized WhatsApp sales message to send to a specific customer. Address as 'Assalam Alaikum' or 'Hi [name]'. Personal, not spammy. Include offer/value.",
  broadcast: "Write a WhatsApp broadcast message for a limited-time offer or promotion for this product. Urgency, scarcity, clear CTA. Under 100 words.",
};

export const generateProductContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    productName: z.string().min(1).max(200),
    price: z.number().positive().optional(),
    description: z.string().max(500).optional(),
    category: z.string().optional(),
    contentType: z.enum(["whatsapp_post","instagram_caption","product_description","sales_message","broadcast"]),
    tone: z.enum(["professional","friendly","urgent","humorous"]).optional(),
    customerName: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY ?? "";
    const prompt = CONTENT_PROMPTS[data.contentType];
    const productContext = `Product: ${data.productName}${data.price ? `, Price: PKR ${data.price}` : ""}${data.description ? `, Description: ${data.description}` : ""}${data.category ? `, Category: ${data.category}` : ""}${data.customerName ? `, Customer name: ${data.customerName}` : ""}. Tone: ${data.tone ?? "friendly"}.`;

    if (!key) {
      const fallbacks: Record<ContentType, string> = {
        whatsapp_post: `🔥 *${data.productName}* available!\n\n✅ Price: PKR ${data.price?.toLocaleString() ?? "Contact us"}\n✅ Instant delivery\n✅ 100% genuine\n\nOrder karo aaj hi! Reply karo is message pe 👇`,
        instagram_caption: `✨ ${data.productName} now available!\n\nGet yours today at the best price 🔥\n\n#${data.productName?.replace(/\s/g,"")} #Pakistan #OnlineShopping #DigitalProducts #Reseller`,
        product_description: `${data.productName} is a premium digital product perfect for professionals and creators. Get instant access at competitive pricing with full support.`,
        sales_message: `Assalam Alaikum${data.customerName ? ` ${data.customerName}` : ""}! 😊\n\nHope you're doing well! We have *${data.productName}* available at PKR ${data.price?.toLocaleString() ?? "great price"}. \n\nInterested? Reply YES and I'll send you the details! 🙏`,
        broadcast: `⚡ LIMITED TIME OFFER!\n\n*${data.productName}* at just PKR ${data.price?.toLocaleString() ?? "Contact"}\n\n🔴 Limited stock — reply NOW!\n\n_SuperSender Pro_`,
      };
      const text = fallbacks[data.contentType];
      return { type: data.contentType, text, wordCount: text.split(/\s+/).length } as GeneratedContent;
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are an expert copywriter for a Pakistani digital products reseller. ${prompt} Return JSON: {text: string, hashtags: string[]|null}` },
          { role: "user", content: productContext },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) throw new Error("AI generation failed");
    const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
    try {
      const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
      const text = String(parsed.text ?? "");
      return { type: data.contentType, text, hashtags: parsed.hashtags as string[] | undefined, wordCount: text.split(/\s+/).length } as GeneratedContent;
    } catch { throw new Error("Parse error"); }
  });

export const parseBulkOrderCSV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ csvText: z.string().min(1).max(100000) }).parse(d))
  .handler(async ({ data }) => {
    const lines = data.csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [] as BulkImportOrder[];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g,"_"));
    const fieldMap: Record<string, keyof BulkImportOrder> = {
      name: "customerName", customer_name: "customerName", customer: "customerName",
      whatsapp: "whatsapp", phone: "whatsapp", number: "whatsapp",
      product: "product", tool: "product", item: "product",
      plan: "plan", subscription: "plan",
      qty: "quantity", quantity: "quantity",
      price: "price", amount: "price", sell_price: "price",
      payment: "paymentMethod", payment_method: "paymentMethod", method: "paymentMethod",
      notes: "notes", note: "notes", remarks: "notes",
    };

    return lines.slice(1).filter((l) => l.trim()).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g,""));
      const order: BulkImportOrder = { valid: true };
      headers.forEach((h, i) => {
        const field = fieldMap[h];
        if (!field) return;
        const val = values[i] ?? "";
        if (field === "quantity" || field === "price") {
          const num = Number(val.replace(/[^0-9.]/g,""));
          if (!isNaN(num)) (order as Record<string, unknown>)[field] = num;
        } else {
          (order as Record<string, unknown>)[field] = val || undefined;
        }
      });
      if (!order.product && !order.customerName) { order.valid = false; order.error = "Missing product and customer"; }
      return order;
    });
  });

export const confirmBulkOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orders: z.array(z.record(z.string(), z.unknown())) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let created = 0; let failed = 0;
    for (const o of data.orders) {
      try {
        await supabase.from("orders").insert({ user_id: userId, tool: o.product ?? "Unknown", plan: o.plan ?? "Standard", sell_price: Number(o.price ?? 0), quantity: Number(o.quantity ?? 1), status: "pending", source: "bulk_import", notes: String(o.notes ?? "") });
        created++;
      } catch { failed++; }
    }
    return { ok: true, created, failed };
  });
