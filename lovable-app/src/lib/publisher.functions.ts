import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const platforms = ["facebook", "instagram", "linkedin", "tiktok", "whatsapp", "telegram"] as const;
type Platform = typeof platforms[number];

interface SocialAccount {
  id: string;
  platform: Platform;
  access_token?: string | null;
  remote_id?: string | null;
}

interface PostRow {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  media_type: string | null;
  status: string;
}

interface PostTargetRow {
  id: string;
  platform: Platform;
  social_accounts: SocialAccount | null;
}

const CaptionInput = z.object({
  topic: z.string().min(2).max(2000),
  platforms: z.array(z.enum(platforms)).min(1),
  tone: z.string().optional(),
});

export const generateCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CaptionInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const sys = `You are a social media copywriter. Generate ONE caption (max 280 chars) plus 5-8 relevant hashtags. Match the tone for the listed platforms. Return JSON {"caption": string, "hashtags": string[]}.`;
    const user = `Topic: ${data.topic}\nPlatforms: ${data.platforms.join(", ")}\nTone: ${data.tone ?? "engaging, friendly"}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      if (r.status === 429) throw new Error("Rate limited — please wait a moment.");
      if (r.status === 402) throw new Error("AI credits exhausted in workspace.");
      throw new Error(`AI error ${r.status}: ${t}`);
    }
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return {
        caption: String(parsed.caption ?? "").slice(0, 1000),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 12).map(String) : [],
      };
    } catch {
      return { caption: content.slice(0, 1000), hashtags: [] };
    }
  });

const PublishInput = z.object({
  postId: z.string().uuid(),
});

export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PublishInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: post, error: pErr } = await supabase
      .from("posts").select("*").eq("id", data.postId).eq("user_id", userId).single();
    if (pErr || !post) throw new Error("Post not found");

    const { data: targets, error: tErr } = await supabase
      .from("post_targets").select("*, social_accounts(*)").eq("post_id", data.postId);
    if (tErr) throw tErr;
    if (!targets || targets.length === 0) throw new Error("No targets selected");

    await supabase.from("posts").update({ status: "publishing" }).eq("id", data.postId);

    const results = await Promise.all((targets as PostTargetRow[]).map(async (t) => {
      const acc = t.social_accounts;
      try {
        await supabase.from("post_targets").update({ status: "publishing", attempted_at: new Date().toISOString() }).eq("id", t.id);
        const r = await publishToPlatform(t.platform, acc, post as PostRow);
        await supabase.from("post_targets").update({
          status: "published", remote_post_id: r.remote_post_id ?? null,
          remote_url: r.remote_url ?? null, completed_at: new Date().toISOString(),
        }).eq("id", t.id);
        return { id: t.id, ok: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("post_targets").update({
          status: "failed", error_message: msg.slice(0, 500), completed_at: new Date().toISOString(),
        }).eq("id", t.id);
        return { id: t.id, ok: false, error: msg };
      }
    }));

    const okCount = results.filter(r => r.ok).length;
    const finalStatus = okCount === results.length ? "published" : okCount === 0 ? "failed" : "partial";
    await supabase.from("posts").update({
      status: finalStatus,
      published_at: okCount > 0 ? new Date().toISOString() : null,
    }).eq("id", data.postId);

    return { results, status: finalStatus };
  });

async function publishToPlatform(platform: Platform, account: SocialAccount | null, post: PostRow): Promise<{ remote_post_id?: string; remote_url?: string }> {
  if (platform === "telegram") return publishTelegram(account, post);
  if (platform === "linkedin") return publishLinkedIn(account, post);
  if (platform === "tiktok") return publishTikTok(account, post);
  // Facebook/Instagram/WhatsApp require Meta app credentials (Phase 2)
  throw new Error(`${platform}: OAuth setup pending. Connect via Connections page first.`);
}

async function publishLinkedIn(account: SocialAccount | null, post: PostRow) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const linkedInKey = process.env.LINKEDIN_API_KEY;
  if (!lovableKey || !linkedInKey) throw new Error("LinkedIn connector not linked. Open Connections → LinkedIn.");

  // Get member URN
  const meRes = await fetch("https://connector-gateway.lovable.dev/linkedin/v2/userinfo", {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": linkedInKey },
  });
  if (!meRes.ok) throw new Error(`LinkedIn auth failed (${meRes.status})`);
  const me = await meRes.json();
  const sub = me.sub as string;
  const authorUrn = `urn:li:person:${sub}`;

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: post.content ?? "" },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const r = await fetch("https://connector-gateway.lovable.dev/linkedin/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": linkedInKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`LinkedIn publish failed (${r.status}): ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  const id = j.id as string | undefined;
  return { remote_post_id: id, remote_url: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
}

async function publishTikTok(account: SocialAccount | null, post: PostRow) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tiktokKey = process.env.TIKTOK_API_KEY;
  if (!lovableKey || !tiktokKey) throw new Error("TikTok connector not linked. Open Connections → TikTok.");

  const videoUrl: string | undefined = post.media_urls?.[0];
  if (!videoUrl || post.media_type !== "video") {
    throw new Error("TikTok requires a video. Upload a video file.");
  }

  const r = await fetch("https://connector-gateway.lovable.dev/tiktok/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tiktokKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: (post.content ?? "").slice(0, 150),
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`TikTok publish failed (${r.status}): ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  const pubId = j?.data?.publish_id as string | undefined;
  return { remote_post_id: pubId };
}

async function publishTelegram(account: SocialAccount | null, post: PostRow) {
  const botToken: string | undefined = account?.access_token ?? undefined;
  const chatId: string | undefined = account?.remote_id ?? undefined;
  if (!botToken || !chatId) throw new Error("Telegram bot token / chat_id missing");

  const base = `https://api.telegram.org/bot${botToken}`;
  const text = post.content ?? "";
  const media = post.media_urls ?? [];

  let res: Response;
  if (media.length === 0) {
    res = await fetch(`${base}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } else if (post.media_type === "video") {
    res = await fetch(`${base}/sendVideo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, video: media[0], caption: text, parse_mode: "HTML" }),
    });
  } else {
    res = await fetch(`${base}/sendPhoto`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: media[0], caption: text, parse_mode: "HTML" }),
    });
  }
  const j = await res.json();
  if (!j.ok) throw new Error(j.description ?? `Telegram error ${res.status}`);
  const messageId = j.result?.message_id;
  return { remote_post_id: messageId ? String(messageId) : undefined };
}
