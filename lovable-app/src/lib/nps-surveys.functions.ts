import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface NPSSurvey {
  id: string;
  name: string;
  question: string;
  triggerType: "manual" | "post_order" | "renewal" | "scheduled";
  scheduledAt?: string;
  status: "draft" | "active" | "completed";
  totalSent: number;
  totalResponded: number;
  promoters: number;
  passives: number;
  detractors: number;
  npsScore: number;
  createdAt: string;
}

export interface NPSResponse {
  id: string;
  surveyId: string;
  customerName: string;
  whatsapp: string;
  score: number;
  category: "promoter" | "passive" | "detractor";
  feedback?: string;
  respondedAt: string;
}

const MOCK_SURVEYS: NPSSurvey[] = [
  { id: "nps1", name: "Post-Order NPS — June", question: "SuperSender Pro ki service se aap kitne khush hain? (0-10 score bhejein)", triggerType: "post_order", status: "active", totalSent: 456, totalResponded: 234, promoters: 156, passives: 54, detractors: 24, npsScore: 57, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "nps2", name: "Renewal Satisfaction", question: "Renewal process kaisi rahi? (1-10 rating bhejein)", triggerType: "renewal", status: "active", totalSent: 123, totalResponded: 87, promoters: 68, passives: 12, detractors: 7, npsScore: 70, createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "nps3", name: "Product Quality Survey", question: "Purchased product se aap kitne satisfied hain? 0-10 mein batayein", triggerType: "manual", status: "completed", totalSent: 200, totalResponded: 112, promoters: 78, passives: 22, detractors: 12, npsScore: 59, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

const MOCK_RESPONSES: NPSResponse[] = [
  { id: "r1", surveyId: "nps1", customerName: "Ahmed Khan", whatsapp: "03001234567", score: 10, category: "promoter", feedback: "Bohat acha service hai! Hamesha time pe deliver hoti hai.", respondedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "r2", surveyId: "nps1", customerName: "Sara Ali", whatsapp: "03111234567", score: 8, category: "promoter", feedback: "Good service, keep it up", respondedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "r3", surveyId: "nps1", customerName: "Bilal Raza", whatsapp: "03211234567", score: 6, category: "passive", feedback: "Theek hai, thoda improve ho sakta hai", respondedAt: new Date(Date.now() - 10800000).toISOString() },
  { id: "r4", surveyId: "nps1", customerName: "Fatima Noor", whatsapp: "03321234567", score: 3, category: "detractor", feedback: "Response time slow hai", respondedAt: new Date(Date.now() - 86400000).toISOString() },
];

export const getNPSSurveys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_SURVEYS);

export const getNPSResponses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ surveyId: z.string() }))
  .handler(async ({ data }) => MOCK_RESPONSES.filter(r => r.surveyId === data.surveyId));

export const saveNPSSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string(), question: z.string(), triggerType: z.enum(["manual","post_order","renewal","scheduled"]) }))
  .handler(async ({ data }) => ({ success: true, id: `nps_${Date.now()}`, ...data }));

export const sendNPSSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ surveyId: z.string(), targetAll: z.boolean().optional() }))
  .handler(async ({ data }) => ({ success: true, sent: 456, surveyId: data.surveyId, note: "Demo: NPS survey sent via WhatsApp to all customers" }));
