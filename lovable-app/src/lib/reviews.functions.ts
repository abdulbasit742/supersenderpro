import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export interface Review {
  id: string;
  customerId?: string;
  customerName?: string;
  whatsapp?: string;
  orderId?: string;
  product?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  status: "pending" | "approved" | "replied" | "flagged";
  reply?: string;
  requestSentAt?: string;
  receivedAt?: string;
}

export interface ReviewStats {
  totalReviews: number;
  avgRating: number;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
  responseRate: number;
  pendingReplies: number;
}

export interface ReviewConfig {
  autoRequestAfterDays: number;
  requestMessage: string;
  thankYouMessage: string;
  escalateOnStarLessThan: number;
  isActive: boolean;
}

const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  autoRequestAfterDays: 3,
  requestMessage: "Hi {{name}}! 😊 Hope you're enjoying {{product}}. We'd love your feedback! Rate us (1-5 ⭐): Reply with your rating + any comment.",
  thankYouMessage: "Thank you for your {{rating}}⭐ review, {{name}}! We really appreciate it. 🙏",
  escalateOnStarLessThan: 3,
  isActive: true,
};

const MOCK_REVIEWS: Review[] = [
  { id: "r1", customerName: "Ahmed Khan", whatsapp: "03001234567", product: "ChatGPT Plus", rating: 5, comment: "Bhai bahut acha service hai, fast delivery!", status: "approved", receivedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "r2", customerName: "Sara Ali", whatsapp: "03111234567", product: "Claude Pro", rating: 4, comment: "Good but slightly expensive", status: "pending", receivedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "r3", customerName: "Bilal Raza", whatsapp: "03211234567", product: "LinkedIn Premium", rating: 2, comment: "Delivery slow tha", status: "flagged", receivedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "r4", customerName: "Fatima Noor", whatsapp: "03321234567", product: "Midjourney", rating: 5, comment: "Perfect! Shukriya bhai", status: "replied", reply: "Shukriya Fatima ji! 🙏 Always happy to help!", receivedAt: new Date(Date.now() - 172800000).toISOString() },
];

export const getReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    let q = db.from("reviews").select("*").eq("user_id", userId).order("received_at", { ascending: false }).limit(100);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: reviews } = await q;
    if (!reviews?.length) return MOCK_REVIEWS;
    return reviews as Review[];
  });

export const getReviewStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("reviews").select("rating, status").eq("user_id", userId);
    if (!data?.length) {
      return { totalReviews: MOCK_REVIEWS.length, avgRating: 4.0, fiveStar: 2, fourStar: 1, threeStar: 0, twoStar: 1, oneStar: 0, responseRate: 50, pendingReplies: 2 } as ReviewStats;
    }
    const reviews = data as Array<{ rating: number; status: string }>;
    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + Number(r.rating), 0);
    const counts = [1,2,3,4,5].map((n) => reviews.filter((r) => Number(r.rating) === n).length);
    const replied = reviews.filter((r) => r.status === "replied").length;
    return { totalReviews: total, avgRating: total ? Math.round((sum / total) * 10) / 10 : 0, fiveStar: counts[4], fourStar: counts[3], threeStar: counts[2], twoStar: counts[1], oneStar: counts[0], responseRate: total ? Math.round((replied / total) * 100) : 0, pendingReplies: reviews.filter((r) => r.status === "pending").length } as ReviewStats;
  });

export const sendReviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ customerId: z.string().uuid(), orderId: z.string().uuid().optional(), whatsapp: z.string().min(10), customerName: z.string(), product: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cfgRow } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const cfg = ((cfgRow?.settings as Record<string, unknown>)?.reviewConfig ?? DEFAULT_REVIEW_CONFIG) as ReviewConfig;
    const message = cfg.requestMessage.replace("{{name}}", data.customerName).replace("{{product}}", data.product);
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (token && phoneId) {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g,""), type: "text", text: { body: message } }) });
    }
    await logAuditEvent({ data: { action: `Review request sent to ${data.customerName}`, targetType: "review", severity: "info" } });
    return { ok: true, demo: !token };
  });

export const replyToReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reviewId: z.string().uuid(), reply: z.string().min(1).max(1000), whatsapp: z.string().min(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("reviews").update({ reply: data.reply, status: "replied" }).eq("id", data.reviewId).eq("user_id", userId);
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (token && phoneId) {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g,""), type: "text", text: { body: data.reply } }) });
    }
    return { ok: true };
  });

export const getReviewConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.reviewConfig ?? DEFAULT_REVIEW_CONFIG) as ReviewConfig;
  });

export const saveReviewConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, reviewConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });
