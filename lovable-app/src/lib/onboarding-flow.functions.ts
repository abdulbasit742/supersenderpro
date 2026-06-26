import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  delayHours: number;
  messageTemplate: string;
  isActive: boolean;
}

export interface CustomerOnboarding {
  id: string;
  customerId: string;
  customerName: string;
  whatsapp: string;
  startedAt: string;
  currentStep: number;
  totalSteps: number;
  status: "active" | "completed" | "paused" | "dropped";
  nextMessageAt?: string;
  completedSteps: number[];
}

const MOCK_STEPS: OnboardingStep[] = [
  { id: "os1", order: 1, title: "Welcome Message", description: "Send warm welcome with order details", delayHours: 0, messageTemplate: "🎉 Welcome {{name}}! Aapka {{product}} order mila. Credentials 2 ghante mein aayenge. Koi sawal? Reply karo!", isActive: true },
  { id: "os2", order: 2, title: "Credentials Delivery", description: "Send login credentials", delayHours: 2, messageTemplate: "✅ {{name}} bhai — yahan hain aapke credentials:\n\nEmail: {{email}}\nPass: {{password}}\n\nKisi masle pe reply karo!", isActive: true },
  { id: "os3", order: 3, title: "Day 1 Check-in", description: "Check if product is working", delayHours: 24, messageTemplate: "Assalam Alaikum {{name}}! 😊 {{product}} kaisa chal raha hai? Koi difficulty? Reply YES if all good!", isActive: true },
  { id: "os4", order: 4, title: "Day 3 Tips", description: "Share product tips", delayHours: 72, messageTemplate: "💡 {{name}}, {{product}} ki ek zabardast tip:\n\n{{tip}}\n\nAur tips ke liye reply: TIPS", isActive: true },
  { id: "os5", order: 5, title: "Day 7 Feedback", description: "Request NPS rating", delayHours: 168, messageTemplate: "🙏 {{name}}, ek hafte hogaya! Hamari service rate karein 1-10 mein?\n\nAapki feedback bahut important hai!", isActive: true },
];

const MOCK_ONBOARDINGS: CustomerOnboarding[] = [
  { id: "ob1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", startedAt: new Date(Date.now() - 3600000).toISOString(), currentStep: 1, totalSteps: 5, status: "active", nextMessageAt: new Date(Date.now() + 5400000).toISOString(), completedSteps: [1] },
  { id: "ob2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", startedAt: new Date(Date.now() - 86400000).toISOString(), currentStep: 3, totalSteps: 5, status: "active", nextMessageAt: new Date(Date.now() + 48 * 3600000).toISOString(), completedSteps: [1, 2, 3] },
  { id: "ob3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", startedAt: new Date(Date.now() - 7 * 86400000).toISOString(), currentStep: 5, totalSteps: 5, status: "completed", completedSteps: [1, 2, 3, 4, 5] },
  { id: "ob4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", startedAt: new Date(Date.now() - 2 * 86400000).toISOString(), currentStep: 2, totalSteps: 5, status: "paused", completedSteps: [1, 2] },
];

export const getOnboardingSteps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_STEPS);

export const getCustomerOnboardings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_ONBOARDINGS);

export const saveOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().optional(), order: z.number(), title: z.string(), description: z.string(), delayHours: z.number(), messageTemplate: z.string(), isActive: z.boolean() }))
  .handler(async ({ data }) => ({ success: true, id: data.id ?? `os_${Date.now()}` }));

export const startOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ customerId: z.string(), customerName: z.string(), whatsapp: z.string() }))
  .handler(async ({ data }) => ({ success: true, id: `ob_${Date.now()}`, ...data, status: "active" }));

export const pauseResumeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ onboardingId: z.string(), action: z.enum(["pause", "resume"]) }))
  .handler(async ({ data }) => ({ success: true, ...data }));
