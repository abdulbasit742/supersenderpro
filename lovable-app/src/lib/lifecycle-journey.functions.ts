import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export type JourneyTrigger = "new_customer" | "order_placed" | "payment_received" | "order_expired" | "churn_risk" | "birthday" | "manual";
export type StepType = "wait" | "send_message" | "send_template" | "add_tag" | "update_status" | "webhook" | "ai_message";

export interface JourneyStep {
  id: string;
  type: StepType;
  label: string;
  config: Record<string, unknown>;
  delayDays?: number;
  delayHours?: number;
}

export interface CustomerJourney {
  id: string;
  name: string;
  trigger: JourneyTrigger;
  isActive: boolean;
  steps: JourneyStep[];
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
}

export interface JourneyEnrollment {
  id: string;
  journeyId: string;
  journeyName: string;
  customerId: string;
  customerName?: string;
  currentStep: number;
  status: "active" | "completed" | "paused" | "failed";
  nextActionAt?: string;
  startedAt: string;
}

const JourneyStepSchema = z.object({
  id: z.string(),
  type: z.enum(["wait","send_message","send_template","add_tag","update_status","webhook","ai_message"]),
  label: z.string(),
  config: z.record(z.string(), z.unknown()),
  delayDays: z.number().int().nonnegative().optional(),
  delayHours: z.number().int().nonnegative().optional(),
});

export const getJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("customer_journeys").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []) as CustomerJourney[];
  });

export const saveJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    trigger: z.enum(["new_customer","order_placed","payment_received","order_expired","churn_risk","birthday","manual"]),
    steps: z.array(JourneyStepSchema),
    isActive: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const payload: Record<string, unknown> = { user_id: userId, name: data.name, trigger: data.trigger, steps: data.steps, is_active: data.isActive ?? true, created_at: new Date().toISOString() };
    if (data.id) {
      const { data: r } = await db.from("customer_journeys").update(payload).eq("id", data.id).eq("user_id", userId).select().single();
      await logAuditEvent({ data: { action: `Journey updated: ${data.name}`, targetType: "journey", severity: "info" } });
      return r;
    }
    const { data: r } = await db.from("customer_journeys").insert(payload).select().single();
    await logAuditEvent({ data: { action: `Journey created: ${data.name}`, targetType: "journey", severity: "success" } });
    return r;
  });

export const toggleJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("customer_journeys").update({ is_active: data.isActive }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const deleteJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("customer_journeys").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const enrollCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ journeyId: z.string().uuid(), customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: journey } = await db.from("customer_journeys").select("steps").eq("id", data.journeyId).eq("user_id", userId).single();
    const firstStep = ((journey as Record<string, unknown>)?.steps as JourneyStep[])?.[0];
    const nextAt = firstStep?.delayDays ? new Date(Date.now() + firstStep.delayDays * 86400000).toISOString() : new Date().toISOString();
    await db.from("journey_enrollments").insert({ user_id: userId, journey_id: data.journeyId, customer_id: data.customerId, current_step: 0, status: "active", next_action_at: nextAt, started_at: new Date().toISOString() });
    await logAuditEvent({ data: { action: "Customer enrolled in journey", target: data.customerId, targetType: "journey_enrollment", severity: "info" } });
    return { ok: true };
  });

export const getEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data } = await db.from("journey_enrollments")
      .select("*, customer_journeys(name), customers(name, whatsapp)")
      .eq("user_id", userId).order("started_at", { ascending: false }).limit(100);
    return (data ?? []).map((e) => {
      const r = e as Record<string, unknown>;
      return {
        id: String(r.id), journeyId: String(r.journey_id),
        journeyName: (r.customer_journeys as Record<string, unknown>)?.name as string ?? "Unknown",
        customerId: String(r.customer_id),
        customerName: (r.customers as Record<string, unknown>)?.name as string | undefined,
        currentStep: Number(r.current_step), status: String(r.status ?? "active") as JourneyEnrollment["status"],
        nextActionAt: r.next_action_at as string | undefined, startedAt: String(r.started_at),
      } as JourneyEnrollment;
    });
  });

export const executeJourneyStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enrollmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: enrollment } = await db.from("journey_enrollments")
      .select("*, customer_journeys(steps), customers(whatsapp, name)")
      .eq("id", data.enrollmentId).eq("user_id", userId).single();
    if (!enrollment) throw new Error("Enrollment not found");

    const e = enrollment as Record<string, unknown>;
    const steps = (e.customer_journeys as Record<string, unknown>)?.steps as JourneyStep[] ?? [];
    const currentIdx = Number(e.current_step);
    const step = steps[currentIdx];
    if (!step) {
      await db.from("journey_enrollments").update({ status: "completed" }).eq("id", data.enrollmentId);
      return { ok: true, completed: true };
    }

    const customer = e.customers as Record<string, unknown>;
    if (step.type === "send_message" && customer?.whatsapp) {
      const msg = String(step.config.message ?? "").replace("{{name}}", String(customer.name ?? "Customer"));
      const token = process.env.META_WHATSAPP_TOKEN ?? "";
      const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
      if (token && phoneId) {
        await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: String(customer.whatsapp).replace(/\D/g,""), type: "text", text: { body: msg } }),
        });
      }
    }

    const nextIdx = currentIdx + 1;
    const nextStep = steps[nextIdx];
    const nextAt = nextStep?.delayDays ? new Date(Date.now() + nextStep.delayDays * 86400000).toISOString() : nextStep ? new Date().toISOString() : undefined;
    await db.from("journey_enrollments").update({ current_step: nextIdx, next_action_at: nextAt, status: nextIdx >= steps.length ? "completed" : "active" }).eq("id", data.enrollmentId);
    return { ok: true, completed: nextIdx >= steps.length };
  });
