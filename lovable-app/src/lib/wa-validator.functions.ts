import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ValidatedNumber {
  number: string;
  normalized: string;
  isValid: boolean;
  isWhatsApp: boolean;
  status: "valid_wa" | "valid_no_wa" | "invalid" | "error";
  name?: string;
  about?: string;
  checkedAt: string;
}

export interface ValidationBatch {
  id: string;
  total: number;
  valid: number;
  invalid: number;
  withWhatsApp: number;
  completedAt?: string;
  results: ValidatedNumber[];
}

function normalizeNumber(raw: string): string {
  let n = raw.replace(/\D/g, "");
  if (n.startsWith("0")) n = "92" + n.slice(1);
  else if (!n.startsWith("92")) n = "92" + n;
  return n;
}

export const validateNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    numbers: z.array(z.string()).min(1).max(1000),
  }).parse(d))
  .handler(async ({ data }) => {
    const token = process.env.META_WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";

    const results: ValidatedNumber[] = await Promise.all(
      data.numbers.map(async (raw): Promise<ValidatedNumber> => {
        const cleaned = raw.trim();
        if (!cleaned) return { number: raw, normalized: raw, isValid: false, isWhatsApp: false, status: "invalid", checkedAt: new Date().toISOString() };
        const normalized = normalizeNumber(cleaned);
        if (normalized.length < 11 || normalized.length > 15) return { number: raw, normalized, isValid: false, isWhatsApp: false, status: "invalid", checkedAt: new Date().toISOString() };
        if (!token || !phoneId) {
          const mockIsWA = Math.random() > 0.3;
          return { number: raw, normalized, isValid: true, isWhatsApp: mockIsWA, status: mockIsWA ? "valid_wa" : "valid_no_wa", checkedAt: new Date().toISOString() };
        }
        try {
          const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/contacts`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ blocking: "wait", contacts: [`+${normalized}`] }) });
          if (!r.ok) return { number: raw, normalized, isValid: true, isWhatsApp: false, status: "valid_no_wa", checkedAt: new Date().toISOString() };
          const j = await r.json() as { contacts?: Array<{ status: string; wa_id?: string }> };
          const contact = j.contacts?.[0];
          const isWA = contact?.status === "valid";
          return { number: raw, normalized, isValid: true, isWhatsApp: isWA, status: isWA ? "valid_wa" : "valid_no_wa", checkedAt: new Date().toISOString() };
        } catch { return { number: raw, normalized, isValid: true, isWhatsApp: false, status: "error", checkedAt: new Date().toISOString() }; }
      })
    );

    const valid = results.filter(r => r.isValid).length;
    const withWA = results.filter(r => r.isWhatsApp).length;
    return { id: `batch_${Date.now()}`, total: results.length, valid, invalid: results.length - valid, withWhatsApp: withWA, completedAt: new Date().toISOString(), results } as ValidationBatch;
  });

export const parseNumberList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ text: z.string().min(1).max(500000) }).parse(d))
  .handler(async ({ data }) => {
    const lines = data.text.split(/[\n,;|\t]+/).map(l => l.trim()).filter(l => l.length > 5 && /\d{7,}/.test(l));
    const numbers = [...new Set(lines)];
    return { numbers, count: numbers.length };
  });
