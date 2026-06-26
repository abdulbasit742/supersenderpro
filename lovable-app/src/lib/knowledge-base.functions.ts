import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type ArticleCategory = "account" | "payment" | "product" | "troubleshooting" | "policy" | "faq";

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: ArticleCategory;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  usedByBot: boolean;
  createdAt: string;
  updatedAt: string;
}

const MOCK_ARTICLES: KBArticle[] = [
  { id: "kb1", title: "ChatGPT Plus kaise use karein?", content: "ChatGPT Plus use karne ke liye:\n1. chat.openai.com par jayein\n2. Humari di hui email se login karein\n3. Plus badge confirm karein\n\nAgar login nahi ho raha, humein 03XX number par message karein.", category: "product", tags: ["chatgpt","login","credentials"], views: 234, helpful: 45, notHelpful: 3, usedByBot: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "kb2", title: "Payment kaise karein? (JazzCash / EasyPaisa)", content: "Payment ke tareeqe:\n\n**JazzCash:** 03XX-XXXXXXX par send karein\n**EasyPaisa:** 03XX-XXXXXXX par send karein\n\nPayment ke baad screenshot zaroor bhejein!", category: "payment", tags: ["jazzcash","easypaisa","payment"], views: 456, helpful: 89, notHelpful: 5, usedByBot: true, createdAt: new Date(Date.now() - 25 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "kb3", title: "Subscription expire ho gayi — kya karein?", content: "Agar subscription expire ho gayi:\n1. Hamein WhatsApp karein: 'RENEW [product name]'\n2. Payment karein\n3. 30 min mein renewal ho jayegi\n\nExpiry se pehle reminder message aata hai!", category: "account", tags: ["renewal","expired","subscription"], views: 189, helpful: 67, notHelpful: 8, usedByBot: true, createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "kb4", title: "Netflix 'Account Error' fix kaise karein?", content: "Netflix error aane par:\n1. App clear cache karein\n2. Logout karein aur dubara login karein\n3. Agar phir bhi issue ho — humein screenshot bhejein\n\nHum 2 ghante mein fix kar denge!", category: "troubleshooting", tags: ["netflix","error","fix"], views: 345, helpful: 123, notHelpful: 12, usedByBot: false, createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "kb5", title: "Refund policy kya hai?", content: "Refund policy:\n- Technical issue pe 100% refund\n- 24 ghante ke andar cancel pe 80% refund\n- 24 ghante baad: no refund\n\nRefund ke liye: 'REFUND [order #]' message karein.", category: "policy", tags: ["refund","policy","cancel"], views: 267, helpful: 78, notHelpful: 34, usedByBot: false, createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];

const CAT_LABELS: Record<ArticleCategory, string> = { account: "Account", payment: "Payment", product: "Product", troubleshooting: "Troubleshooting", policy: "Policy", faq: "FAQ" };
const CAT_COLORS: Record<ArticleCategory, string> = { account: "bg-blue-100 text-blue-700", payment: "bg-green-100 text-green-700", product: "bg-purple-100 text-purple-700", troubleshooting: "bg-red-100 text-red-700", policy: "bg-orange-100 text-orange-700", faq: "bg-yellow-100 text-yellow-700" };

export { CAT_LABELS, CAT_COLORS };
export const getKBArticles = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ category: z.string().optional(), search: z.string().optional() })).handler(async ({ data }) => { let a = MOCK_ARTICLES; if (data.category && data.category !== "all") a = a.filter(x => x.category === data.category); if (data.search) { const q = data.search.toLowerCase(); a = a.filter(x => x.title.toLowerCase().includes(q) || x.tags.some(t => t.includes(q))); } return a; });
export const saveKBArticle = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().optional(), title: z.string(), content: z.string(), category: z.string(), tags: z.array(z.string()), usedByBot: z.boolean().optional() })).handler(async ({ data }) => ({ success: true, id: data.id ?? `kb_${Date.now()}` }));
export const deleteKBArticle = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ articleId: z.string() })).handler(async () => ({ success: true }));
export const voteArticle = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ articleId: z.string(), vote: z.enum(["helpful","not_helpful"]) })).handler(async ({ data }) => ({ success: true, ...data }));
