import { createFileRoute } from "@tanstack/react-router";

interface SocialAccountRow {
  id: string;
  platform: string;
  access_token?: string | null;
  remote_id?: string | null;
  metadata?: { recipients?: string[] } | null;
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
  platform: string;
  social_accounts: SocialAccountRow | null;
}

interface DispatchResult {
  id: string;
  status?: string;
  error?: string;
}

export const Route = createFileRoute("/api/public/cron/dispatch")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        const { data: due } = await supabaseAdmin
          .from("posts")
          .select("id, user_id")
          .eq("status", "scheduled")
          .lte("scheduled_at", now)
          .limit(20);

        if (!due || due.length === 0) return Response.json({ ok: true, processed: 0 });

        const results: DispatchResult[] = [];
        for (const p of due) {
          try {
            await supabaseAdmin.from("posts").update({ status: "publishing" }).eq("id", p.id);
            const { data: targets } = await supabaseAdmin
              .from("post_targets").select("*, social_accounts(*)").eq("post_id", p.id);
            const { data: post } = await supabaseAdmin.from("posts").select("*").eq("id", p.id).single();
            if (!post || !targets) continue;

            let okCount = 0;
            for (const t of (targets as PostTargetRow[])) {
              try {
                await supabaseAdmin.from("post_targets").update({ status: "publishing", attempted_at: now }).eq("id", t.id);
                const r = await publishOne(t.platform, t.social_accounts, post as PostRow);
                await supabaseAdmin.from("post_targets").update({
                  status: "published", remote_post_id: r.remote_post_id ?? null,
                  completed_at: new Date().toISOString(),
                }).eq("id", t.id);
                okCount++;
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                await supabaseAdmin.from("post_targets").update({
                  status: "failed", error_message: msg.slice(0, 500),
                  completed_at: new Date().toISOString(),
                }).eq("id", t.id);
              }
            }
            const final = okCount === targets.length ? "published" : okCount === 0 ? "failed" : "partial";
            await supabaseAdmin.from("posts").update({
              status: final, published_at: okCount > 0 ? new Date().toISOString() : null,
            }).eq("id", p.id);
            results.push({ id: p.id, status: final });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ id: p.id, error: msg });
          }
        }
        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});

async function publishOne(platform: string, account: SocialAccountRow | null, post: PostRow) {
  if (platform === "telegram") {
    const base = `https://api.telegram.org/bot${account?.access_token}`;
    const text = post.content ?? "";
    const media = post.media_urls ?? [];
    let res: Response;
    if (media.length === 0) {
      res = await fetch(`${base}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: account?.remote_id, text, parse_mode: "HTML" }) });
    } else if (post.media_type === "video") {
      res = await fetch(`${base}/sendVideo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: account?.remote_id, video: media[0], caption: text, parse_mode: "HTML" }) });
    } else {
      res = await fetch(`${base}/sendPhoto`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: account?.remote_id, photo: media[0], caption: text, parse_mode: "HTML" }) });
    }
    const j = await res.json() as { ok: boolean; description?: string; result?: { message_id?: number } };
    if (!j.ok) throw new Error(j.description ?? "Telegram error");
    return { remote_post_id: j.result?.message_id ? String(j.result.message_id) : undefined };
  }

  if (platform === "linkedin") {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const linkedInKey = process.env.LINKEDIN_API_KEY;
    if (!lovableKey || !linkedInKey) throw new Error("LinkedIn connector not linked");

    const meRes = await fetch("https://connector-gateway.lovable.dev/linkedin/v2/userinfo", {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": linkedInKey },
    });
    if (!meRes.ok) throw new Error(`LinkedIn auth failed (${meRes.status})`);
    const me = await meRes.json() as { sub: string };
    const authorUrn = `urn:li:person:${me.sub}`;

    const r = await fetch("https://connector-gateway.lovable.dev/linkedin/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": linkedInKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: post.content ?? "" },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`LinkedIn publish failed (${r.status}): ${t.slice(0, 200)}`);
    }
    const j = await r.json() as { id?: string };
    const id = j.id;
    return { remote_post_id: id, remote_url: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
  }

  if (platform === "tiktok") {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const tiktokKey = process.env.TIKTOK_API_KEY;
    if (!lovableKey || !tiktokKey) throw new Error("TikTok connector not linked");

    const videoUrl: string | undefined = post.media_urls?.[0];
    if (!videoUrl || post.media_type !== "video") {
      throw new Error("TikTok requires a video");
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
    const j = await r.json() as { data?: { publish_id?: string } };
    return { remote_post_id: j?.data?.publish_id };
  }

  if (platform === "facebook") {
    const token = account?.access_token;
    const pageId = account?.remote_id;
    if (!token || !pageId) throw new Error("Facebook page not connected");
    const text = post.content ?? "";
    const media = post.media_urls ?? [];
    let url: string;
    let body: Record<string, string>;
    if (media.length === 0) {
      url = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      body = { message: text, access_token: token };
    } else if (post.media_type === "video") {
      url = `https://graph.facebook.com/v21.0/${pageId}/videos`;
      body = { file_url: media[0], description: text, access_token: token };
    } else {
      url = `https://graph.facebook.com/v21.0/${pageId}/photos`;
      body = { url: media[0], caption: text, access_token: token };
    }
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });
    const j = await r.json() as { id?: string; post_id?: string; error?: { message?: string } };
    if (!r.ok || j.error) throw new Error(j.error?.message ?? `Facebook error (${r.status})`);
    const id = j.id ?? j.post_id;
    return { remote_post_id: id, remote_url: id ? `https://www.facebook.com/${id}` : undefined };
  }

  if (platform === "instagram") {
    const token = account?.access_token;
    const igUserId = account?.remote_id;
    if (!token || !igUserId) throw new Error("Instagram account not connected");
    const media = post.media_urls ?? [];
    if (media.length === 0) throw new Error("Instagram requires an image or video");
    const isVideo = post.media_type === "video";
    const createParams: Record<string, string> = {
      caption: post.content ?? "",
      access_token: token,
    };
    if (isVideo) {
      createParams.media_type = "REELS";
      createParams.video_url = media[0];
    } else {
      createParams.image_url = media[0];
    }
    const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(createParams).toString(),
    });
    const createJ = await createRes.json() as { id?: string; error?: { message?: string } };
    if (!createRes.ok || createJ.error) throw new Error(createJ.error?.message ?? "IG container failed");
    const creationId = createJ.id;

    if (isVideo) {
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const sRes = await fetch(`https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
        const sJ = await sRes.json() as { status_code?: string };
        if (sJ.status_code === "FINISHED") break;
        if (sJ.status_code === "ERROR") throw new Error("IG video processing failed");
      }
    }

    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: creationId ?? "", access_token: token }).toString(),
    });
    const pubJ = await pubRes.json() as { id?: string; error?: { message?: string } };
    if (!pubRes.ok || pubJ.error) throw new Error(pubJ.error?.message ?? "IG publish failed");
    return { remote_post_id: pubJ.id };
  }

  if (platform === "whatsapp") {
    const token = account?.access_token;
    const phoneId = account?.remote_id;
    const toNumbers: string[] = account?.metadata?.recipients ?? [];
    if (!token || !phoneId) throw new Error("WhatsApp not connected");
    if (toNumbers.length === 0) throw new Error("No WhatsApp recipients configured");
    const media = post.media_urls ?? [];
    const text = post.content ?? "";
    const ids: string[] = [];
    for (const to of toNumbers) {
      const payload: Record<string, unknown> = { messaging_product: "whatsapp", to };
      if (media.length === 0) {
        payload.type = "text";
        payload.text = { body: text };
      } else if (post.media_type === "video") {
        payload.type = "video";
        payload.video = { link: media[0], caption: text };
      } else {
        payload.type = "image";
        payload.image = { link: media[0], caption: text };
      }
      const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
      if (!r.ok || j.error) throw new Error(j.error?.message ?? `WhatsApp error (${r.status})`);
      const id = j.messages?.[0]?.id;
      if (id) ids.push(id);
    }
    return { remote_post_id: ids.join(",") };
  }

  throw new Error(`${platform}: not yet wired`);
}
