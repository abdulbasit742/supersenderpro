import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface BirthdayConfig {
  isActive: boolean;
  sendAtHour: number;
  message: string;
  includeOffer: boolean;
  offerText: string;
  discountPercent: number;
  offerValidDays: number;
}

export interface BirthdayRecord {
  id: string;
  customerId: string;
  customerName: string;
  whatsapp: string;
  birthdate: string;
  nextBirthday: string;
  daysUntil: number;
  lastWishedYear?: number;
  status: "upcoming" | "today" | "sent" | "missed";
}

const DEFAULT_CONFIG: BirthdayConfig = {
  isActive: true,
  sendAtHour: 9,
  message: "🎂 Assalam Alaikum {{name}}!\n\nSuperSender Pro ki taraf se aapko *birthday mubarak ho!* 🎉🎊\n\nAaj ke din aapke liye ek special gift hai:\n\n{{offer}}\n\nYe offer sirf aaj valid hai — reply karo YES to claim! 😊\n\n_SuperSender Pro Team_",
  includeOffer: true,
  offerText: "🎁 Birthday Special: 15% discount on your next renewal!",
  discountPercent: 15,
  offerValidDays: 1,
};

const today = new Date();
function nextBirthdayDays(month: number, day: number): number {
  const next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

const MOCK_BIRTHDAYS: BirthdayRecord[] = [
  { id: "b1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", birthdate: `1995-${String(today.getMonth() + 1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`, nextBirthday: today.toISOString(), daysUntil: 0, status: "today" },
  { id: "b2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", birthdate: "1998-07-15", nextBirthday: new Date(today.getFullYear(), 6, 15).toISOString(), daysUntil: nextBirthdayDays(7, 15), status: "upcoming" },
  { id: "b3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", birthdate: "1992-08-03", nextBirthday: new Date(today.getFullYear(), 7, 3).toISOString(), daysUntil: nextBirthdayDays(8, 3), status: "upcoming" },
  { id: "b4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", birthdate: "2000-06-10", nextBirthday: new Date(today.getFullYear() + 1, 5, 10).toISOString(), daysUntil: nextBirthdayDays(6, 10), lastWishedYear: today.getFullYear(), status: "sent" },
];

export const getBirthdayConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.birthdayConfig ?? DEFAULT_CONFIG) as BirthdayConfig;
  });

export const saveBirthdayConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, birthdayConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });

export const getBirthdays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_BIRTHDAYS.sort((a, b) => a.daysUntil - b.daysUntil));

export const sendBirthdayWish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ customerId: z.string(), whatsapp: z.string(), customerName: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cfgRow } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const cfg = ((cfgRow?.settings as Record<string, unknown>)?.birthdayConfig ?? DEFAULT_CONFIG) as BirthdayConfig;
    const offerText = cfg.includeOffer ? cfg.offerText : "";
    const message = cfg.message.replace("{{name}}", data.customerName).replace("{{offer}}", offerText);
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
    if (token && phoneId) {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: data.whatsapp.replace(/\D/g, ""), type: "text", text: { body: message } }) });
    }
    return { ok: true, demo: !token };
  });
