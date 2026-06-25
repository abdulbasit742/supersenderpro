import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ABTest {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "paused";
  segmentSize: number;
  variantA: ABVariant;
  variantB: ABVariant;
  winner?: "A" | "B" | "tie";
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ABVariant {
  label: string;
  message: string;
  sentCount: number;
  replyCount: number;
  orderCount: number;
  replyRate: number;
  conversionRate: number;
}

const MOCK_TESTS: ABTest[] = [
  {
    id: "ab1", name: "Summer Offer — Tone Test", status: "completed", segmentSize: 200, winner: "B", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), startedAt: new Date(Date.now() - 7 * 86400000).toISOString(), completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    variantA: { label: "Formal", message: "Dear Customer, we have an exclusive offer on ChatGPT Plus. Please contact us to avail.", sentCount: 100, replyCount: 8, orderCount: 3, replyRate: 8, conversionRate: 3 },
    variantB: { label: "Casual Urdu", message: "Bhai! ChatGPT Plus ka zabardast offer aaya hai 🔥 Sirf PKR 4200 — aaj hi lo! Reply karo YES", sentCount: 100, replyCount: 31, orderCount: 14, replyRate: 31, conversionRate: 14 },
  },
  {
    id: "ab2", name: "Renewal Reminder — CTA Test", status: "running", segmentSize: 150, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), startedAt: new Date(Date.now() - 86400000).toISOString(),
    variantA: { label: "With Price", message: "Hi {{name}}! Your Claude Pro expires in 3 days. Renew for PKR 3500 — reply NOW!", sentCount: 75, replyCount: 12, orderCount: 5, replyRate: 16, conversionRate: 6.7 },
    variantB: { label: "No Price (Curiosity)", message: "Hi {{name}}! Your Claude Pro expires soon 😯 Special renewal deal available — reply YES to know more!", sentCount: 75, replyCount: 19, orderCount: 7, replyRate: 25.3, conversionRate: 9.3 },
  },
  { id: "ab3", name: "New Product Launch — Emoji Test", status: "draft", segmentSize: 300, createdAt: new Date().toISOString(), variantA: { label: "No Emojis", message: "New product available: Midjourney Pro. PKR 4500/month. Contact to order.", sentCount: 0, replyCount: 0, orderCount: 0, replyRate: 0, conversionRate: 0 }, variantB: { label: "Heavy Emojis", message: "🔥🎨 Midjourney Pro available NOW! ✅ PKR 4500/month 🚀 Instant delivery 💯 Reply YES!", sentCount: 0, replyCount: 0, orderCount: 0, replyRate: 0, conversionRate: 0 } },
];

export const getABTests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_TESTS);

export const saveABTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(1),
    segmentSize: z.number().positive(),
    variantAMessage: z.string().min(1),
    variantBMessage: z.string().min(1),
    variantALabel: z.string().optional(),
    variantBLabel: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => ({ ok: true, id: `ab_${Date.now()}`, name: data.name }));

export const launchABTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async () => ({ ok: true, status: "running" }));

export const pauseABTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async () => ({ ok: true }));

export const pickWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), winner: z.enum(["A","B"]) }).parse(d))
  .handler(async ({ data }) => ({ ok: true, winner: data.winner, broadcastSent: true }));
