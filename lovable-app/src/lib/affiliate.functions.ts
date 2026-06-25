import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface Affiliate {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  referralCode: string;
  referralLink: string;
  commissionRate: number;
  totalClicks: number;
  totalSignups: number;
  totalOrders: number;
  totalEarned: number;
  pendingPayout: number;
  status: "active" | "paused" | "suspended";
  joinedAt: string;
  lastActivityAt?: string;
}

export interface AffiliateClick {
  id: string;
  affiliateId: string;
  affiliateName: string;
  referralCode: string;
  ip?: string;
  converted: boolean;
  conversionValue?: number;
  clickedAt: string;
}

export interface AffiliateConfig {
  baseUrl: string;
  defaultCommissionRate: number;
  cookieDays: number;
  minPayoutAmount: number;
  payoutMethod: string;
  termsText: string;
  isActive: boolean;
}

const DEFAULT_CONFIG: AffiliateConfig = {
  baseUrl: "https://supersenderpro.com/ref",
  defaultCommissionRate: 20,
  cookieDays: 30,
  minPayoutAmount: 1000,
  payoutMethod: "JazzCash / EasyPaisa",
  termsText: "Earn 20% commission on every successful sale you refer. Payouts are processed weekly.",
  isActive: true,
};

const MOCK_AFFILIATES: Affiliate[] = [
  { id: "af1", name: "Tech Blogger PK", whatsapp: "03001111111", email: "blogger@example.com", referralCode: "TECH20", referralLink: "https://supersenderpro.com/ref/TECH20", commissionRate: 20, totalClicks: 234, totalSignups: 45, totalOrders: 28, totalEarned: 32400, pendingPayout: 8400, status: "active", joinedAt: new Date(Date.now() - 45 * 86400000).toISOString(), lastActivityAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "af2", name: "YouTube Creator", whatsapp: "03112222222", referralCode: "YOUTUBER15", referralLink: "https://supersenderpro.com/ref/YOUTUBER15", commissionRate: 15, totalClicks: 567, totalSignups: 89, totalOrders: 41, totalEarned: 28700, pendingPayout: 4200, status: "active", joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastActivityAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "af3", name: "Social Media PK", whatsapp: "03213333333", referralCode: "SOCIAL10", referralLink: "https://supersenderpro.com/ref/SOCIAL10", commissionRate: 10, totalClicks: 89, totalSignups: 12, totalOrders: 5, totalEarned: 3500, pendingPayout: 3500, status: "paused", joinedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
];

export const getAffiliates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_AFFILIATES);

export const getAffiliateConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.affiliateConfig ?? DEFAULT_CONFIG) as AffiliateConfig;
  });

export const saveAffiliateConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, affiliateConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });

export const inviteAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1), whatsapp: z.string().min(10), commissionRate: z.number().min(1).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const code = `${data.name.replace(/\s/g,"").toUpperCase().slice(0,6)}${Math.floor(Math.random()*100)}`;
    const link = `https://supersenderpro.com/ref/${code}`;
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (token && phoneId) {
      const msg = `Assalam Alaikum ${data.name}! 🎉\n\nYou're now a *SuperSender Pro Affiliate!*\n\n✅ Commission: ${data.commissionRate}% per sale\n🔗 Your Link: ${link}\n📊 Code: ${code}\n\nShare this link and earn on every sale! 💰\n\n_SuperSender Pro_`;
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g, ""), type: "text", text: { body: msg } }) });
    }
    return { ok: true, code, link, demo: !token };
  });

export const processAffiliatePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ affiliateId: z.string(), amount: z.number().positive() }).parse(d))
  .handler(async () => ({ ok: true }));
