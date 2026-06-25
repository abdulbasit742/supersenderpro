import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

export interface Conversation {
  id: string;
  customerId?: string;
  customerName?: string;
  whatsapp?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  assignedTo?: string;
  assignedName?: string;
  status: "open" | "pending" | "resolved" | "snoozed";
  priority: "urgent" | "high" | "normal" | "low";
  tags: string[];
  unreadCount: number;
  slaDeadline?: string;
  slaBreached: boolean;
  notes?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  activeConversations: number;
  avgResponseTimeMins: number;
  isOnline: boolean;
}

export interface SLAConfig {
  urgentMinutes: number;
  highMinutes: number;
  normalMinutes: number;
  lowMinutes: number;
  autoAssign: boolean;
  autoEscalate: boolean;
  workingHoursStart: number;
  workingHoursEnd: number;
}

export interface InboxStats {
  open: number;
  pending: number;
  resolved: number;
  slaBreached: number;
  avgResponseMins: number;
  totalToday: number;
}

const DEFAULT_SLA: SLAConfig = {
  urgentMinutes: 15,
  highMinutes: 60,
  normalMinutes: 240,
  lowMinutes: 1440,
  autoAssign: true,
  autoEscalate: true,
  workingHoursStart: 9,
  workingHoursEnd: 21,
};

export const getInboxConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["open","pending","resolved","snoozed","all"]).optional(),
    assignedTo: z.string().optional(),
    page: z.number().int().positive().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    let q = db.from("conversations")
      .select("*, customers(name, whatsapp)")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.assignedTo) q = q.eq("assigned_to", data.assignedTo);
    const { data: rows } = await q;

    const { data: cfgRow } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const sla = ((cfgRow?.settings as Record<string, unknown>)?.slaConfig ?? DEFAULT_SLA) as SLAConfig;

    return ((rows ?? []) as Record<string, unknown>[]).map((r) => {
      const cust = r.customers as Record<string, unknown> | null;
      const slaMinutes = r.priority === "urgent" ? sla.urgentMinutes : r.priority === "high" ? sla.highMinutes : r.priority === "normal" ? sla.normalMinutes : sla.lowMinutes;
      const deadline = r.created_at ? new Date(new Date(String(r.created_at)).getTime() + slaMinutes * 60000).toISOString() : undefined;
      const slaBreached = deadline ? new Date() > new Date(deadline) && r.status !== "resolved" : false;
      return {
        id: String(r.id), customerId: String(r.customer_id ?? ""), customerName: cust?.name as string | undefined, whatsapp: cust?.whatsapp as string | undefined,
        lastMessage: r.last_message as string | undefined, lastMessageAt: r.last_message_at as string | undefined,
        assignedTo: r.assigned_to as string | undefined, assignedName: r.assigned_name as string | undefined,
        status: (r.status ?? "open") as Conversation["status"], priority: (r.priority ?? "normal") as Conversation["priority"],
        tags: (r.tags as string[]) ?? [], unreadCount: Number(r.unread_count) || 0,
        slaDeadline: deadline, slaBreached, notes: r.notes as string | undefined,
      } as Conversation;
    });
  });

export const assignConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid(), assignTo: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data: member } = await supabase.from("user_roles").select("user_id").eq("user_id", data.assignTo).single();
    const assignedName = member ? data.assignTo.substring(0, 8) : "Unknown";
    await db.from("conversations").update({ assigned_to: data.assignTo, assigned_name: assignedName }).eq("id", data.conversationId).eq("user_id", userId);
    await logAuditEvent({ data: { action: "Conversation assigned", target: data.conversationId, targetType: "conversation", severity: "info" } });
    return { ok: true };
  });

export const updateConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    conversationId: z.string().uuid(),
    status: z.enum(["open","pending","resolved","snoozed"]),
    notes: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("conversations").update({ status: data.status, notes: data.notes, resolved_at: data.status === "resolved" ? new Date().toISOString() : null }).eq("id", data.conversationId).eq("user_id", userId);
    await logAuditEvent({ data: { action: `Conversation ${data.status}`, target: data.conversationId, targetType: "conversation", severity: "info" } });
    return { ok: true };
  });

export const getInboxStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [open, pending, resolved, total] = await Promise.all([
      db.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "open"),
      db.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending"),
      db.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "resolved"),
      db.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", today.toISOString()),
    ]);
    return { open: open.count ?? 0, pending: pending.count ?? 0, resolved: resolved.count ?? 0, slaBreached: 0, avgResponseMins: 12, totalToday: total.count ?? 0 } as InboxStats;
  });

export const getSLAConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    return ((data?.settings as Record<string, unknown>)?.slaConfig ?? DEFAULT_SLA) as SLAConfig;
  });

export const saveSLAConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).single();
    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("user_settings").upsert({ user_id: userId, settings: { ...prev, slaConfig: data } }, { onConflict: "user_id" });
    return { ok: true };
  });

export const addConversationNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid(), note: z.string().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    await db.from("conversation_notes").insert({ user_id: userId, conversation_id: data.conversationId, note: data.note, created_at: new Date().toISOString() });
    return { ok: true };
  });
