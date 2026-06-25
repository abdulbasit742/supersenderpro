import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface TelegramUpdate {
  update_id: number;
  channel_post?: {
    message_id: number;
    text?: string;
    caption?: string;
    chat?: { username?: string };
    photo?: Array<{ file_id: string }>;
    video?: { file_id: string };
  };
}

export const listChannelSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("channel_sources")
      .select("*, social_accounts:bot_account_id(handle, platform)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const SaveSource = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  identifier: z.string().min(1).max(200),
  bot_account_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  auto_publish: z.boolean().optional(),
  ai_rewrite: z.boolean().optional(),
});

export const saveChannelSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSource.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { data: r, error } = await supabase.from("channel_sources")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", data.id).eq("user_id", userId).select().single();
      if (error) throw error;
      return r;
    }
    const { data: r, error } = await supabase.from("channel_sources")
      .insert({ ...data, user_id: userId, kind: "telegram" }).select().single();
    if (error) throw error;
    return r;
  });

export const deleteChannelSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("channel_sources")
      .delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listChannelItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("channel_items")
      .select("*, channel_sources(name, identifier)")
      .eq("user_id", context.userId)
      .order("fetched_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

// Pull new messages from Telegram bot for a given source
export const pullChannelUpdates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: src, error: sErr } = await supabase.from("channel_sources")
      .select("*").eq("id", data.sourceId).eq("user_id", userId).single();
    if (sErr || !src) throw new Error("Source not found");
    if (!src.bot_account_id) throw new Error("Bot account not linked. Pehle Connections → Telegram bot add karein.");

    const { data: bot } = await supabase.from("social_accounts")
      .select("access_token").eq("id", src.bot_account_id).eq("user_id", userId).single();
    const token = bot?.access_token;
    if (!token) throw new Error("Bot token missing");

    const offset = Number(src.last_update_id ?? 0) + 1;
    const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&allowed_updates=["channel_post"]&timeout=0`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.description || "Telegram error");

    const targetIdent = String(src.identifier).replace(/^@/, "").toLowerCase();
    let lastId = Number(src.last_update_id ?? 0);
    let inserted = 0;

    for (const upd of (j.result as TelegramUpdate[])) {
      lastId = Math.max(lastId, upd.update_id);
      const p = upd.channel_post;
      if (!p) continue;
      const chatUser = String(p.chat?.username ?? "").toLowerCase();
      if (chatUser && chatUser !== targetIdent) continue;

      const content = (p.text ?? p.caption ?? "") as string;
      const media: string[] = [];
      let mediaType: string | null = null;
      if (p.photo?.length) {
        const best = p.photo[p.photo.length - 1];
        const fr = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${best.file_id}`);
        const fj = await fr.json();
        if (fj.ok) { media.push(`https://api.telegram.org/file/bot${token}/${fj.result.file_path}`); mediaType = "image"; }
      } else if (p.video?.file_id) {
        const fr = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${p.video.file_id}`);
        const fj = await fr.json();
        if (fj.ok) { media.push(`https://api.telegram.org/file/bot${token}/${fj.result.file_path}`); mediaType = "video"; }
      }

      const { error: iErr } = await supabase.from("channel_items").insert({
        user_id: userId, source_id: src.id,
        remote_id: String(p.message_id),
        content, media_urls: media, media_type: mediaType,
        status: "queued",
      });
      if (!iErr) inserted++;
    }

    await supabase.from("channel_sources").update({ last_update_id: lastId }).eq("id", src.id);
    return { inserted, lastUpdateId: lastId };
  });

// Approve a queued item: create a post + targets for all active social accounts, then publish
export const broadcastChannelItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    itemId: z.string().uuid(),
    platforms: z.array(z.string()).optional(),
    editedContent: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: item, error: iErr } = await supabase.from("channel_items")
      .select("*").eq("id", data.itemId).eq("user_id", userId).single();
    if (iErr || !item) throw new Error("Item not found");

    const { data: accounts } = await supabase.from("social_accounts")
      .select("id, platform").eq("user_id", userId).eq("is_active", true);
    let targetAccounts = accounts ?? [];
    if (data.platforms?.length) targetAccounts = targetAccounts.filter(a => data.platforms!.includes(a.platform));
    if (targetAccounts.length === 0) throw new Error("No active social accounts. Connections page se add karein.");

    const content = data.editedContent ?? item.content ?? "";
    const { data: post, error: pErr } = await supabase.from("posts").insert({
      user_id: userId,
      content,
      media_urls: item.media_urls ?? [],
      media_type: item.media_type,
      status: "draft",
    }).select().single();
    if (pErr || !post) throw pErr ?? new Error("Post create failed");

    const targets = targetAccounts.map(a => ({
      post_id: post.id, social_account_id: a.id, platform: a.platform, status: "pending" as const,
    }));
    await supabase.from("post_targets").insert(targets);
    await supabase.from("channel_items").update({
      status: "broadcasting", post_id: post.id, published_at: new Date().toISOString(),
    }).eq("id", item.id);

    // Delegate publishing
    const { publishPost } = await import("./publisher.functions");
    try {
      const res = await publishPost({ data: { postId: post.id } });
      await supabase.from("channel_items").update({ status: "published" }).eq("id", item.id);
      return { ok: true, postId: post.id, res };
    } catch (e: unknown) {
      await supabase.from("channel_items").update({ status: "failed" }).eq("id", item.id);
      throw e;
    }
  });

export const deleteChannelItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("channel_items")
      .delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// AI Rewrite a queued channel item
export const rewriteChannelItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: z.string().uuid(), tone: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: item, error: iErr } = await supabase.from("channel_items")
      .select("*").eq("id", data.itemId).eq("user_id", userId).single();
    if (iErr || !item) throw new Error("Item not found");
    if (!item.content) throw new Error("Item has no content to rewrite");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(key);
    const tone = data.tone || "engaging and professional";

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `You are a professional social media content writer. Rewrite the given content to be ${tone}. Keep the core message but make it more suitable for social media. Maintain the original language. Output only the rewritten text without explanations or quotes.`,
      prompt: item.content,
    });

    const { error: uErr } = await supabase.from("channel_items")
      .update({ ai_content: text.trim() }).eq("id", item.id);
    if (uErr) throw uErr;

    return { aiContent: text.trim() };
  });
