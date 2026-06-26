import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type ReplyCondition = "exact" | "contains" | "starts_with" | "regex";
export type ReplyAction = "send_message" | "send_catalog" | "create_ticket" | "forward_agent" | "send_payment_link";

export interface AutoReplyRule {
  id: string;
  name: string;
  keywords: string[];
  condition: ReplyCondition;
  isCaseSensitive: boolean;
  response: string;
  action: ReplyAction;
  actionData?: string;
  priority: number;
  isActive: boolean;
  matchCount: number;
  lastMatchAt?: string;
  createdAt: string;
}

export interface AutoReplyConfig {
  isActive: boolean;
  respondOutsideHours: boolean;
  businessHoursStart: number;
  businessHoursEnd: number;
  outsideHoursMessage: string;
  defaultFallbackMessage: string;
}

const MOCK_RULES: AutoReplyRule[] = [
  { id: "ar1", name: "Price Inquiry", keywords: ["price", "rate", "kitna", "cost", "qeemat"], condition: "contains", isCaseSensitive: false, response: "💰 Aaj ki prices:\n\n• ChatGPT Plus: PKR 3,500\n• Netflix: PKR 2,500\n• Canva Pro: PKR 1,800\n\nOrder ke liye reply: BUY [product name]", action: "send_message", priority: 1, isActive: true, matchCount: 234, lastMatchAt: new Date(Date.now() - 1800000).toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "ar2", name: "Order Keyword", keywords: ["buy", "order", "khareedna", "chahiye"], condition: "contains", isCaseSensitive: false, response: "🛒 Order process karne ke liye:\n\n1. Product ka naam batayein\n2. Quantity batayein\n3. Payment method choose karein (JazzCash/EasyPaisa)\n\nAgent se baat ke liye reply: AGENT", action: "send_message", priority: 2, isActive: true, matchCount: 189, lastMatchAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "ar3", name: "Support Request", keywords: ["help", "problem", "issue", "masla", "kaam nahi"], condition: "contains", isCaseSensitive: false, response: "🆘 Sorry for the trouble! Aapki request support team ko bhej di gayi hai.\n\nEk agent 15-30 min mein reply karega. Jazakallah!", action: "create_ticket", priority: 3, isActive: true, matchCount: 67, lastMatchAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "ar4", name: "Human Agent", keywords: ["agent", "human", "rep", "insan"], condition: "contains", isCaseSensitive: false, response: "👋 Aapko human agent se connect kar raha hoon. Please ek minute wait karein!", action: "forward_agent", priority: 4, isActive: true, matchCount: 45, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "ar5", name: "Payment Link Request", keywords: ["payment link", "jazzcash link", "easypaisa link", "send link"], condition: "contains", isCaseSensitive: false, response: "💳 Payment link bhej raha hoon!", action: "send_payment_link", actionData: "https://payment.supersenderpro.com/", priority: 5, isActive: false, matchCount: 23, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
];
const MOCK_CONFIG: AutoReplyConfig = { isActive: true, respondOutsideHours: true, businessHoursStart: 9, businessHoursEnd: 22, outsideHoursMessage: "Assalam Alaikum! 🌙 Abhi office hours nahi hain. Kal subah 9 baje reply milegi. Aapka message note kar liya gaya hai!", defaultFallbackMessage: "Shukriya! Aapka message mila. Ek agent jald reply karega. 😊" };

export const getAutoReplyRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_RULES);

export const getAutoReplyConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_CONFIG);

export const saveAutoReplyRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().optional(), name: z.string(), keywords: z.array(z.string()), condition: z.string(), response: z.string(), action: z.string(), priority: z.number().optional(), isActive: z.boolean().optional() }))
  .handler(async ({ data }) => ({ success: true, id: data.id ?? `ar_${Date.now()}` }));

export const deleteAutoReplyRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ ruleId: z.string() }))
  .handler(async () => ({ success: true }));

export const saveAutoReplyConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.record(z.unknown()))
  .handler(async ({ data }) => ({ success: true, ...data }));

export const testAutoReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ message: z.string() }))
  .handler(async ({ data }) => {
    const msg = data.message.toLowerCase();
    const matched = MOCK_RULES.filter(r => r.isActive && r.keywords.some(k => msg.includes(k.toLowerCase()))).sort((a, b) => a.priority - b.priority)[0];
    return matched ? { matched: true, ruleName: matched.name, response: matched.response, action: matched.action } : { matched: false, response: MOCK_CONFIG.defaultFallbackMessage, action: "send_message" };
  });
