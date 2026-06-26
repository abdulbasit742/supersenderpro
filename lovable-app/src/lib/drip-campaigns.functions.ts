import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface DripStep {
  id: string;
  order: number;
  delayDays: number;
  delayHours: number;
  messageTemplate: string;
  condition?: "always" | "if_no_reply" | "if_not_converted";
}

export interface DripCampaign {
  id: string;
  name: string;
  description: string;
  triggerType: "signup" | "purchase" | "renewal_due" | "inactivity" | "manual";
  steps: DripStep[];
  isActive: boolean;
  enrolledCount: number;
  completedCount: number;
  convertedCount: number;
  createdAt: string;
}

export interface DripEnrollment {
  id: string;
  campaignId: string;
  campaignName: string;
  customerId: string;
  customerName: string;
  whatsapp: string;
  currentStep: number;
  status: "active" | "completed" | "converted" | "unsubscribed";
  startedAt: string;
  nextMessageAt?: string;
}

const MOCK_CAMPAIGNS: DripCampaign[] = [
  {
    id: "dc1", name: "New Customer Welcome Drip", description: "7-day welcome sequence for all new buyers", triggerType: "signup", isActive: true, enrolledCount: 234, completedCount: 156, convertedCount: 89,
    steps: [
      { id: "s1", order: 1, delayDays: 0, delayHours: 0, messageTemplate: "🎉 Welcome {{name}}! Aapka {{product}} ready hai. Koi bhi help ke liye reply karein!", condition: "always" },
      { id: "s2", order: 2, delayDays: 1, delayHours: 0, messageTemplate: "{{name}}, {{product}} theek chal raha hai? Agar koi issue ho toh abhi batayein!", condition: "if_no_reply" },
      { id: "s3", order: 3, delayDays: 3, delayHours: 0, messageTemplate: "💡 Pro Tip: {{product}} ka yeh feature bohot kaam ka hai — [tip here]", condition: "always" },
      { id: "s4", order: 4, delayDays: 7, delayHours: 0, messageTemplate: "Ek hafte ho gaya {{name}}! Kaisa laga {{product}}? 1-10 mein rate karein!", condition: "always" },
    ],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: "dc2", name: "Renewal Reminder Drip", description: "3-message renewal push before expiry", triggerType: "renewal_due", isActive: true, enrolledCount: 89, completedCount: 45, convertedCount: 67,
    steps: [
      { id: "s5", order: 1, delayDays: -7, delayHours: 0, messageTemplate: "⚠️ {{name}}, aapka {{product}} 7 din mein expire hoga! Abhi renew karein: PKR {{price}}", condition: "always" },
      { id: "s6", order: 2, delayDays: -3, delayHours: 0, messageTemplate: "🔔 Sirf 3 din baaki! {{product}} expire hone wala hai {{name}}. Reply: RENEW", condition: "if_no_reply" },
      { id: "s7", order: 3, delayDays: -1, delayHours: 0, messageTemplate: "⚡ LAST CHANCE! {{name}} — kal {{product}} expire hoga. Abhi reply karein!", condition: "if_no_reply" },
    ],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: "dc3", name: "Win-Back Inactive Customers", description: "Re-engage customers inactive 30+ days", triggerType: "inactivity", isActive: false, enrolledCount: 56, completedCount: 12, convertedCount: 8,
    steps: [
      { id: "s8", order: 1, delayDays: 0, delayHours: 0, messageTemplate: "{{name}} bhai, kaisa haal? 😊 Kaafi waqt hogaya — kuch chahiye?", condition: "always" },
      { id: "s9", order: 2, delayDays: 3, delayHours: 0, messageTemplate: "🎁 {{name}} ke liye special offer: {{product}} pe 15% discount! Sirf aaj ke liye.", condition: "if_no_reply" },
    ],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
];

const MOCK_ENROLLMENTS: DripEnrollment[] = [
  { id: "de1", campaignId: "dc1", campaignName: "New Customer Welcome Drip", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", currentStep: 2, status: "active", startedAt: new Date(Date.now() - 86400000).toISOString(), nextMessageAt: new Date(Date.now() + 2 * 86400000).toISOString() },
  { id: "de2", campaignId: "dc1", campaignName: "New Customer Welcome Drip", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", currentStep: 4, status: "completed", startedAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: "de3", campaignId: "dc2", campaignName: "Renewal Reminder Drip", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", currentStep: 1, status: "converted", startedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];

export const getDripCampaigns = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_CAMPAIGNS);
export const getDripEnrollments = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ campaignId: z.string().optional() })).handler(async ({ data }) => data.campaignId ? MOCK_ENROLLMENTS.filter(e => e.campaignId === data.campaignId) : MOCK_ENROLLMENTS);
export const saveDripCampaign = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().optional(), name: z.string(), description: z.string(), triggerType: z.string(), isActive: z.boolean().optional() })).handler(async ({ data }) => ({ success: true, id: data.id ?? `dc_${Date.now()}` }));
export const toggleDripCampaign = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ campaignId: z.string(), isActive: z.boolean() })).handler(async ({ data }) => ({ success: true, ...data }));
export const enrollCustomer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ campaignId: z.string(), customerId: z.string(), customerName: z.string(), whatsapp: z.string() })).handler(async ({ data }) => ({ success: true, enrollmentId: `de_${Date.now()}`, ...data }));
