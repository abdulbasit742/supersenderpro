import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";


export const listSocialAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const SaveAccountInput = z.object({
  id: z.string().uuid().optional(),
  platform: z.enum(["facebook", "instagram", "linkedin", "tiktok", "whatsapp", "telegram"]),
  handle: z.string().min(1).max(120),
  access_token: z.string().max(2000).optional().nullable(),
  remote_id: z.string().max(500).optional().nullable(),
  refresh_token: z.string().max(2000).optional().nullable(),
  token_expires_at: z.string().optional().nullable(),
  meta: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().optional(),
});

export const saveSocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveAccountInput.parse(d))
  .handler(async ({ data, context }) => {
  const { supabase, userId } = context;
  const payload: Record<string, unknown> = {
    ...data,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
    if (data.id) {
      const { data: updated, error } = await supabase
        .from("social_accounts")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({ data: { action: "Social account updated", target: data.handle, targetType: "social_account", severity: "info" } });
      return updated;
    }
    const { data: created, error } = await supabase
      .from("social_accounts")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    await logAuditEvent({ data: { action: "Social account created", target: data.handle, targetType: "social_account", severity: "success" } });
    return created;
  });

export const deleteSocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    await logAuditEvent({ data: { action: "Social account deleted", target: data.id, targetType: "social_account", severity: "warning" } });
    return { ok: true };
  });

// ---------- Posts ----------

export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("posts")
      .select("*, post_targets(*, social_accounts(platform, handle))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

const CreatePostInput = z.object({
  content: z.string().min(1).max(5000),
  media_urls: z.array(z.string().url().or(z.string().max(0))).max(10).optional(),
  media_type: z.enum(["image", "video"]).optional().nullable(),
  scheduled_at: z.string().optional().nullable(),
  targets: z.array(z.object({
    platform: z.enum(["facebook", "instagram", "linkedin", "tiktok", "whatsapp", "telegram"]),
    social_account_id: z.string().uuid(),
  })).min(1),
});

export const listScheduledPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("posts")
      .select("*, post_targets(*, social_accounts(platform, handle))")
      .eq("user_id", userId)
      .in("status", ["scheduled", "draft"])
      .order("scheduled_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreatePostInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const status = data.scheduled_at ? "scheduled" : "draft";
    const { data: post, error: pErr } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        content: data.content,
        media_urls: data.media_urls ?? [],
        media_type: data.media_type,
        scheduled_at: data.scheduled_at,
        status,
      })
      .select()
      .single();
    if (pErr || !post) throw pErr ?? new Error("Post creation failed");

    const targetRows = data.targets.map((t) => ({
      post_id: post.id,
      platform: t.platform,
      social_account_id: t.social_account_id,
      status: "pending" as const,
    }));

    const { error: tErr } = await supabase.from("post_targets").insert(targetRows);
    if (tErr) throw tErr;

    await logAuditEvent({ data: { action: "Post created", target: post.id, targetType: "post", severity: "success" } });
    return post;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    await logAuditEvent({ data: { action: "Post deleted", target: data.id, targetType: "post", severity: "destructive" } });
    return { ok: true };
  });
