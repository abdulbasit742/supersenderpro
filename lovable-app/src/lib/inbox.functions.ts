import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";


export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msgs, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return msgs ?? [];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      conversationId: z.string().uuid(),
      content: z.string().min(1).max(5000),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();

    const { error: mErr } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      sender: "me",
      content: data.content,
    });
    if (mErr) throw mErr;

    const { error: cErr } = await supabase.from("conversations").update({
      last_message: data.content,
      last_message_at: now,
      unread_count: 0,
    }).eq("id", data.conversationId).eq("user_id", userId);
    if (cErr) throw cErr;

    await logAuditEvent({ data: { action: "Message sent", target: data.conversationId, targetType: "conversation", severity: "info" } });
    return { ok: true };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      contactName: z.string().min(1).max(120),
      contactPhone: z.string().max(50).optional(),
      intent: z.string().max(50).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conv, error } = await supabase.from("conversations").insert({
      user_id: userId,
      contact_name: data.contactName,
      contact_phone: data.contactPhone ?? null,
      intent: data.intent ?? null,
      status: "open",
    }).select().single();
    if (error) throw error;
    await logAuditEvent({ data: { action: "Conversation created", target: conv.id, targetType: "conversation", severity: "success" } });
    return conv;
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversations").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    await logAuditEvent({ data: { action: "Conversation deleted", target: data.id, targetType: "conversation", severity: "destructive" } });
    return { ok: true };
  });
