import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type SuggestionType = "upsell" | "winback" | "renewal" | "cross_sell" | "retention" | "celebration";
export type SuggestionPriority = "urgent" | "high" | "medium" | "low";

export interface SmartSuggestion {
  id: string;
  customerId: string;
  customerName: string;
  whatsapp: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  reason: string;
  suggestedMessage: string;
  potentialRevenue: number;
  confidence: number;
  isDismissed: boolean;
  isActedOn: boolean;
  generatedAt: string;
}

const MOCK_SUGGESTIONS: SmartSuggestion[] = [
  { id: "ss1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", type: "upsell", priority: "urgent", title: "Upsell to Annual Plan", reason: "Ahmed has renewed monthly 8 times — annual plan saves him 25%", suggestedMessage: "Ahmed bhai! 😊 Aap 8 mahine se ChatGPT le rahe hain. Annual plan pe switch karein — PKR 38,000 mein 12 mahine! Abhi reply karein.", potentialRevenue: 38000, confidence: 87, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "ss2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", type: "cross_sell", priority: "high", title: "Cross-sell Canva Pro", reason: "Sara buys ChatGPT — 72% of ChatGPT buyers also buy Canva Pro", suggestedMessage: "Sara ji, ChatGPT ke saath Canva Pro bhi try karein! AI + Design combination bohot powerful hai. PKR 1800/month. Interested?", potentialRevenue: 1800, confidence: 72, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "ss3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", type: "renewal", priority: "urgent", title: "Renewal Due in 3 Days", reason: "Subscription expires 2025-01-10 — no renewal order yet", suggestedMessage: "Bilal bhai! Aapka Netflix 3 din mein expire hoga. Abhi renew karein PKR 2500 mein. Payment ke baad instantly activate!", potentialRevenue: 2500, confidence: 95, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "ss4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", type: "winback", priority: "medium", title: "Win Back — 21 Days Inactive", reason: "Last order 21 days ago, previously ordered every 10 days", suggestedMessage: "Fatima ji, aapko miss kar rahe hain! 😊 Kuch chahiye? Naye products bhi aa gaye hain. Koi bhi help ke liye reply karein!", potentialRevenue: 2800, confidence: 54, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: "ss5", customerId: "c5", customerName: "Hassan Malik", whatsapp: "03421234567", type: "celebration", priority: "low", title: "1-Year Anniversary", reason: "Hassan became a customer exactly 1 year ago today", suggestedMessage: "Hassan bhai, ek saal hogaya! 🎉 Aapka shukriya humare saath rehne ka. Special discount: 10% OFF next order. Code: YEAR1", potentialRevenue: 350, confidence: 90, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "ss6", customerId: "c6", customerName: "Zara Baig", whatsapp: "03521234567", type: "retention", priority: "high", title: "Risk: 3rd Complaint", reason: "Zara filed 3 support tickets this month — churn risk 78%", suggestedMessage: "Zara ji, aapke experience se maafi chahta hoon. Aapki saari issues personally resolve karunga. Ek free month de raha hoon!", potentialRevenue: 2500, confidence: 78, isDismissed: true, isActedOn: false, generatedAt: new Date(Date.now() - 86400000).toISOString() },
];

const TYPE_LABELS: Record<SuggestionType, string> = { upsell: "Upsell", winback: "Win-Back", renewal: "Renewal", cross_sell: "Cross-sell", retention: "Retention", celebration: "Celebration" };
const TYPE_COLORS: Record<SuggestionType, string> = { upsell: "bg-green-100 text-green-700", winback: "bg-blue-100 text-blue-700", renewal: "bg-red-100 text-red-700", cross_sell: "bg-purple-100 text-purple-700", retention: "bg-orange-100 text-orange-700", celebration: "bg-yellow-100 text-yellow-700" };
const PRIORITY_COLORS: Record<SuggestionPriority, string> = { urgent: "border-l-red-500", high: "border-l-orange-400", medium: "border-l-yellow-400", low: "border-l-gray-300" };

export { TYPE_LABELS, TYPE_COLORS, PRIORITY_COLORS };
export const getSmartSuggestions = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_SUGGESTIONS.filter(s => !s.isDismissed));
export const actOnSuggestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ suggestionId: z.string() })).handler(async ({ data }) => ({ success: true, suggestionId: data.suggestionId, note: "Demo: WhatsApp message sent to customer" }));
export const dismissSuggestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ suggestionId: z.string() })).handler(async ({ data }) => ({ success: true, suggestionId: data.suggestionId }));
export const regenerateSuggestions = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async () => ({ success: true, count: MOCK_SUGGESTIONS.length, note: "Demo: AI suggestions refreshed" }));
