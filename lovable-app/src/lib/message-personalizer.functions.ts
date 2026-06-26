import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: "broadcast" | "renewal" | "welcome" | "offer" | "followup" | "custom";
  usageCount: number;
  lastUsed?: string;
}

export interface PersonalizedPreview {
  whatsapp: string;
  customerName: string;
  message: string;
}

const MOCK_TEMPLATES: MessageTemplate[] = [
  { id: "t1", name: "Renewal Reminder", template: "Assalam Alaikum {{name}} bhai! 👋\n\nAapka {{product}} subscription *{{days}} din mein expire* hone wala hai.\n\nRenewal ke liye sirf *PKR {{price}}* — abhi reply karo YES!\n\n_SuperSender Pro_", variables: ["name", "product", "days", "price"], category: "renewal", usageCount: 234, lastUsed: new Date(Date.now() - 3600000).toISOString() },
  { id: "t2", name: "Welcome New Customer", template: "🎉 Welcome {{name}}!\n\nSuperSender Pro family mein aapka khairmaqdaam!\n\nAapka pehla order *{{product}}* ready hai.\n\nCredentials abhhi bhej rahe hain — ek minute! ⏳", variables: ["name", "product"], category: "welcome", usageCount: 567, lastUsed: new Date(Date.now() - 86400000).toISOString() },
  { id: "t3", name: "Flash Sale Blast", template: "🚨 *FLASH SALE — Sirf {{hours}} Ghante!*\n\n{{product}} pe *{{discount}}% OFF*\n\nNormal Price: PKR {{original}}\n*SALE Price: PKR {{sale}}*\n\n⏰ Offer {{time}} pe khatam!\nAbhi reply: BUY\n\n_Offer limited time only_", variables: ["hours", "product", "discount", "original", "sale", "time"], category: "offer", usageCount: 89 },
  { id: "t4", name: "Follow-up Inactive", template: "Assalam Alaikum {{name}}!\n\nAapko yaad kar raha tha 😊\n\n{{days}} din se aapka koi order nahi aaya.\n\nKya koi masla hai? Reply karo aur main personally help karunga!\n\n_{{agentName}}_", variables: ["name", "days", "agentName"], category: "followup", usageCount: 145 },
];

export const getTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_TEMPLATES);

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().optional(), name: z.string(), template: z.string(), category: z.string() }))
  .handler(async ({ data }) => ({ success: true, id: data.id ?? `t_${Date.now()}` }));

export const previewPersonalized = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ template: z.string(), contacts: z.array(z.record(z.string())) }))
  .handler(async ({ data }): Promise<PersonalizedPreview[]> => {
    return data.contacts.slice(0, 5).map(c => {
      let msg = data.template;
      Object.entries(c).forEach(([k, v]) => { msg = msg.replace(new RegExp(`{{${k}}}`, "g"), String(v)); });
      return { whatsapp: String(c.whatsapp ?? ""), customerName: String(c.name ?? ""), message: msg };
    });
  });

export const sendPersonalizedBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ template: z.string(), contacts: z.array(z.record(z.string())) }))
  .handler(async ({ data }) => ({ success: true, sent: data.contacts.length, note: "Demo: Personalized batch queued for delivery" }));
