'use strict';
/**
 * channelAutomationCenter.js — Channel Automation Command Center for SuperSender Pro.
 *
 * Self-contained engine that powers the unified Channel Automation system:
 *  - Source / Target channel manager (Module 1)
 *  - Forwarding pipeline: normalize -> dedupe -> safety -> branding -> queue -> approval -> publish -> log (Module 2)
 *  - Branding / caption / CTA layer (Module 3)
 *  - Social media bridge adapters: Telegram, Facebook, Instagram, LinkedIn, TikTok + WhatsApp fallback packets (Module 4)
 *  - Ecommerce -> channel hooks (Module 5)
 *  - Reliability: retry/backoff, queue-stuck detector, log archive, health doctor (Module 10)
 *  - WhatsApp admin command handlers (Module 7)
 *
 * Design rules honoured from the project conventions:
 *  - Persists ONLY into data/*.json (auto-ignored by .gitignore) — never commits runtime data.
 *  - Pure Node built-ins + global fetch (Node 20). No new dependencies.
 *  - Dry-run is the DEFAULT. Live publishing requires settings.dryRun === false AND not paused.
 *  - Missing tokens/permissions return a CLEAR error object — never throw past the server.
 *  - No spam / stealth / anti-ban features. Admin-owned channels + opted-in targets only.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILES = {
  sources: 'channel_center_sources.json',
  targets: 'channel_center_targets.json',
  queue: 'channel_center_queue.json',
  logs: 'channel_center_logs.json',
  settings: 'channel_center_settings.json',
  dedupe: 'channel_center_dedupe.json',
  packets: 'channel_center_manual_packets.json'
};

const DEFAULT_SETTINGS = {
  dryRun: true,             // safety: live publishing OFF until explicitly disabled
  paused: false,            // global pause switch
  requireApprovalDefault: false,
  dripIntervalMinutes: 0,   // 0 = publish immediately when approved; >0 = drip publisher
  maxMediaBytes: 16 * 1024 * 1024,
  forwardingDepthLimit: 2,
  rateLimitPerHour: 60,
  removeLinks: false,
  removePhones: false,
  brandFooter: '',
  cta: '',
  competitorKeywords: [],
  blacklistSenders: [],
  adminSecretRequired: true
};

function nowIso() { return new Date().toISOString(); }
function uid(prefix = 'q') { return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`; }

function createChannelAutomationCenter(opts = {}) {
  const dataDir = opts.dataDir || path.join(__dirname, '..', 'data');
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) {}

  // ── JSON persistence (mirrors server.js loadJSON/saveJSON style) ───────────
  function load(file, def) {
    try { return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')); }
    catch (_) { return def; }
  }
  function save(file, data) {
    try { fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2), 'utf8'); return true; }
    catch (e) { console.error('[ChannelCenter] save error', file, e.message); return false; }
  }

  function getSettings() { return { ...DEFAULT_SETTINGS, ...(load(FILES.settings, {}) || {}) }; }
  function setSettings(patch) {
    const next = { ...getSettings(), ...(patch || {}) };
    save(FILES.settings, next);
    return next;
  }
  const getSources = () => load(FILES.sources, []);
  const getTargets = () => load(FILES.targets, []);
  const getQueue = () => load(FILES.queue, []);
  const getLogs = () => load(FILES.logs, []);

  function log(entry) {
    const logs = getLogs();
    logs.push({ id: uid('log'), ts: nowIso(), ...entry });
    // keep last 2000 (archive older to keep file small)
    if (logs.length > 2000) logs.splice(0, logs.length - 2000);
    save(FILES.logs, logs);
    return entry;
  }

  // ── Module 1: Source / Target managers ─────────────────────────────────────
  function addSource(input = {}) {
    const sources = getSources();
    const id = input.id || uid('src');
    const rec = {
      id,
      name: input.name || 'Unnamed Source',
      channelId: input.channelId || '',
      link: input.link || '',
      category: input.category || 'general',
      priority: Number(input.priority) || 1,
      language: input.language || 'auto',
      trustLevel: input.trustLevel || 'medium',
      listType: input.listType === 'blacklist' ? 'blacklist' : 'whitelist',
      rules: {
        autoForward: input.autoForward !== false,
        requireApproval: !!input.requireApproval,
        allowedMedia: input.allowedMedia || ['text', 'image', 'video', 'document'],
        keywordAllow: input.keywordAllow || [],
        keywordBlock: input.keywordBlock || [],
        removeLinks: !!input.removeLinks,
        removePhones: !!input.removePhones,
        appendBranding: input.appendBranding !== false,
        targets: input.targets || []   // target channel ids this source maps to
      },
      health: { status: 'unknown', lastPostAt: null, postsToday: 0, successRate: 100 },
      createdAt: nowIso()
    };
    const idx = sources.findIndex(s => s.id === id);
    if (idx >= 0) sources[idx] = { ...sources[idx], ...rec }; else sources.push(rec);
    save(FILES.sources, sources);
    return rec;
  }

  function updateSource(id, patch = {}) {
    const sources = getSources();
    const idx = sources.findIndex(s => s.id === id);
    if (idx < 0) return null;
    sources[idx] = { ...sources[idx], ...patch, rules: { ...sources[idx].rules, ...(patch.rules || {}) } };
    save(FILES.sources, sources);
    return sources[idx];
  }

  function removeSource(id) {
    const sources = getSources().filter(s => s.id !== id);
    save(FILES.sources, sources);
    return true;
  }

  function addTarget(input = {}) {
    const targets = getTargets();
    const id = input.id || uid('tgt');
    const rec = {
      id,
      name: input.name || 'Unnamed Target',
      channelId: input.channelId || '',
      platform: input.platform || 'whatsapp', // whatsapp|telegram|facebook|instagram|linkedin|tiktok
      branding: input.branding || '',
      status: 'configured',
      queueCount: 0,
      createdAt: nowIso()
    };
    const idx = targets.findIndex(t => t.id === id);
    if (idx >= 0) targets[idx] = { ...targets[idx], ...rec }; else targets.push(rec);
    save(FILES.targets, targets);
    return rec;
  }
  function updateTarget(id, patch = {}) {
    const targets = getTargets();
    const idx = targets.findIndex(t => t.id === id);
    if (idx < 0) return null;
    targets[idx] = { ...targets[idx], ...patch };
    save(FILES.targets, targets);
    return targets[idx];
  }
  function removeTarget(id) {
    save(FILES.targets, getTargets().filter(t => t.id !== id));
    return true;
  }

  // Source health checker
  function refreshSourceHealth() {
    const sources = getSources();
    const now = Date.now();
    sources.forEach(s => {
      const last = s.health?.lastPostAt ? Date.parse(s.health.lastPostAt) : 0;
      const ageH = last ? (now - last) / 36e5 : Infinity;
      let status = 'dead';
      if (ageH <= 6) status = 'active';
      else if (ageH <= 48) status = 'silent';
      s.health = { ...(s.health || {}), status };
    });
    save(FILES.sources, sources);
    return sources;
  }

  // ── Module 3: Branding / caption / scrub layer ─────────────────────────────
  const LINK_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
  const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;

  function cleanCaption(text, src, settings) {
    let out = String(text || '');
    const removeLinks = src?.rules?.removeLinks || settings.removeLinks;
    const removePhones = src?.rules?.removePhones || settings.removePhones;
    if (removeLinks) out = out.replace(LINK_RE, '').replace(/\s{2,}/g, ' ').trim();
    if (removePhones) out = out.replace(PHONE_RE, '').replace(/\s{2,}/g, ' ').trim();
    return out;
  }

  function applyBranding(text, target, src, settings) {
    let out = String(text || '');
    if (src?.rules?.appendBranding !== false) {
      const footer = target?.branding || settings.brandFooter;
      if (footer) out += `\n\n${footer}`;
      if (settings.cta) out += `\n${settings.cta}`;
    }
    return out.trim();
  }

  // ── Module 2: Safety checks + dedupe ───────────────────────────────────────
  function hashPost(post) {
    const basis = `${post.text || ''}|${post.mediaUrl || ''}|${post.mediaHash || ''}`.toLowerCase().trim();
    return crypto.createHash('sha1').update(basis).digest('hex');
  }
  function isDuplicate(hash) {
    const dedupe = load(FILES.dedupe, {});
    return !!dedupe[hash];
  }
  function markSeen(hash) {
    const dedupe = load(FILES.dedupe, {});
    dedupe[hash] = Date.now();
    // prune entries older than 30 days
    const cutoff = Date.now() - 30 * 864e5;
    for (const k of Object.keys(dedupe)) if (dedupe[k] < cutoff) delete dedupe[k];
    save(FILES.dedupe, dedupe);
  }

  function runSafetyChecks(post, src, settings) {
    const reasons = [];
    const text = String(post.text || '');
    const lower = text.toLowerCase();
    const rules = src?.rules || {};
    // media type
    if (post.mediaType && Array.isArray(rules.allowedMedia) && !rules.allowedMedia.includes(post.mediaType)) {
      reasons.push(`media type "${post.mediaType}" not allowed for source`);
    }
    // media size
    if (post.mediaBytes && post.mediaBytes > settings.maxMediaBytes) {
      reasons.push(`media size ${post.mediaBytes} exceeds limit ${settings.maxMediaBytes}`);
    }
    // keyword allowlist
    if (Array.isArray(rules.keywordAllow) && rules.keywordAllow.length) {
      const ok = rules.keywordAllow.some(k => lower.includes(String(k).toLowerCase()));
      if (!ok) reasons.push('no allowlist keyword matched');
    }
    // keyword blocklist
    if (Array.isArray(rules.keywordBlock) && rules.keywordBlock.some(k => lower.includes(String(k).toLowerCase()))) {
      reasons.push('blocklist keyword matched');
    }
    // competitor mention blocker
    if (Array.isArray(settings.competitorKeywords) && settings.competitorKeywords.some(k => lower.includes(String(k).toLowerCase()))) {
      reasons.push('competitor mention blocked');
    }
    // blacklisted sender
    if (Array.isArray(settings.blacklistSenders) && post.sender && settings.blacklistSenders.includes(post.sender)) {
      reasons.push('blacklisted sender');
    }
    // forwarding depth limiter
    if (Number(post.depth || 0) > Number(settings.forwardingDepthLimit)) {
      reasons.push('forwarding depth limit exceeded');
    }
    return { ok: reasons.length === 0, reasons };
  }

  // ── Module 4: Publish adapters ─────────────────────────────────────────────
  // Every adapter returns { success, dryRun?, error?, fix?, packet? } and NEVER throws.
  async function publishTelegram(target, content) {
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
    const chatId = target.channelId || process.env.TELEGRAM_CHANNEL_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    if (!token) return { success: false, error: 'Telegram bot token missing', fix: 'Set TELEGRAM_BOT_TOKEN in .env' };
    if (!chatId) return { success: false, error: 'Telegram chat/channel id missing', fix: 'Set target.channelId or TELEGRAM_CHANNEL_CHAT_ID' };
    try {
      const method = content.mediaUrl ? 'sendPhoto' : 'sendMessage';
      const body = content.mediaUrl
        ? { chat_id: chatId, photo: content.mediaUrl, caption: content.text }
        : { chat_id: chatId, text: content.text };
      const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) return { success: false, error: j.description || `Telegram HTTP ${r.status}`, fix: 'Check bot is admin of the channel' };
      return { success: true, id: j.result?.message_id };
    } catch (e) { return { success: false, error: e.message, fix: 'Check network / token' }; }
  }

  async function publishFacebook(target, content) {
    const token = process.env.FB_PAGE_ACCESS_TOKEN;
    const pageId = target.channelId || process.env.FACEBOOK_PAGE_ID;
    if (!token) return { success: false, error: 'Facebook page token missing', fix: 'Set FB_PAGE_ACCESS_TOKEN in .env' };
    if (!pageId) return { success: false, error: 'Facebook page id missing', fix: 'Set target.channelId or FACEBOOK_PAGE_ID' };
    try {
      const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content.text, link: content.link || undefined, access_token: token })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) return { success: false, error: j.error?.message || `Facebook HTTP ${r.status}`, fix: 'Check pages_manage_posts permission + page id' };
      return { success: true, id: j.id };
    } catch (e) { return { success: false, error: e.message, fix: 'Check network / token' }; }
  }

  async function publishInstagram(target, content) {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const igUserId = target.channelId || process.env.INSTAGRAM_IG_USER_ID;
    if (!token) return { success: false, error: 'Instagram token missing', fix: 'Set INSTAGRAM_ACCESS_TOKEN in .env' };
    if (!igUserId) return { success: false, error: 'Instagram business user id missing', fix: 'Set target.channelId or INSTAGRAM_IG_USER_ID' };
    if (!content.mediaUrl) return { success: false, error: 'Instagram requires an image/video URL', fix: 'Provide content.mediaUrl (public https URL)' };
    try {
      const isVideo = /\.(mp4|mov)$/i.test(content.mediaUrl) || content.mediaType === 'video';
      const createBody = { caption: content.text, access_token: token };
      if (isVideo) { createBody.media_type = 'REELS'; createBody.video_url = content.mediaUrl; }
      else { createBody.image_url = content.mediaUrl; }
      const c = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createBody)
      });
      const cj = await c.json().catch(() => ({}));
      if (!c.ok || cj.error) return { success: false, error: cj.error?.message || `IG create HTTP ${c.status}`, fix: 'Check instagram_content_publish permission' };
      const pub = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: cj.id, access_token: token })
      });
      const pj = await pub.json().catch(() => ({}));
      if (!pub.ok || pj.error) return { success: false, error: pj.error?.message || `IG publish HTTP ${pub.status}`, fix: 'Media may still be processing — retry shortly' };
      return { success: true, id: pj.id };
    } catch (e) { return { success: false, error: e.message, fix: 'Check network / token' }; }
  }

  async function publishLinkedIn(target, content) {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const author = target.channelId || process.env.LINKEDIN_AUTHOR_URN; // urn:li:organization:xxx OR urn:li:person:xxx
    if (!token) return { success: false, error: 'LinkedIn token missing', fix: 'Set LINKEDIN_ACCESS_TOKEN in .env' };
    if (!author) return { success: false, error: 'LinkedIn author URN missing', fix: 'Set target.channelId or LINKEDIN_AUTHOR_URN (org or person)' };
    try {
      const body = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: content.text }, shareMediaCategory: 'NONE' } },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      };
      const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify(body)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.message) return { success: false, error: j.message || `LinkedIn HTTP ${r.status}`, fix: 'Check w_member_social / org permission + author URN' };
      return { success: true, id: j.id };
    } catch (e) { return { success: false, error: e.message, fix: 'Check network / token' }; }
  }

  async function publishTikTok(target, content) {
    // TikTok direct publish is restricted; default to DRAFT mode handoff.
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) return { success: false, error: 'TikTok token missing', fix: 'Set TIKTOK_ACCESS_TOKEN; TikTok runs in draft mode by default' };
    return {
      success: true, draft: true,
      note: 'TikTok content prepared as DRAFT. Direct publish needs approved TikTok Content Posting API scope.',
      packet: { platform: 'tiktok', text: content.text, mediaUrl: content.mediaUrl }
    };
  }

  function whatsappManualPacket(target, content) {
    // WhatsApp Channel direct publish is not guaranteed — always produce a manual fallback packet.
    const packets = load(FILES.packets, []);
    const packet = {
      id: uid('pkt'), ts: nowIso(), platform: 'whatsapp_channel',
      targetId: target.id, targetName: target.name, channelId: target.channelId,
      text: content.text, mediaUrl: content.mediaUrl || null, status: 'pending'
    };
    packets.push(packet);
    if (packets.length > 500) packets.splice(0, packets.length - 500);
    save(FILES.packets, packets);
    return { success: true, fallback: true, packet, note: 'WhatsApp channel manual packet created — admin can post via publisher/manual action.' };
  }

  async function publishToTarget(target, content, settings) {
    if (settings.dryRun) {
      return { success: true, dryRun: true, preview: content, target: target.name };
    }
    switch ((target.platform || 'whatsapp').toLowerCase()) {
      case 'telegram': return publishTelegram(target, content);
      case 'facebook': return publishFacebook(target, content);
      case 'instagram': return publishInstagram(target, content);
      case 'linkedin': return publishLinkedIn(target, content);
      case 'tiktok': return publishTikTok(target, content);
      case 'whatsapp':
      case 'whatsapp_channel':
      default: return whatsappManualPacket(target, content);
    }
  }

  // Retry with backoff wrapper (Module 10)
  async function publishWithRetry(target, content, settings, attempts = 3) {
    let last;
    for (let i = 0; i < attempts; i++) {
      last = await publishToTarget(target, content, settings);
      if (last.success) return last;
      await new Promise(r => setTimeout(r, Math.min(2000 * (i + 1), 6000)));
    }
    return last || { success: false, error: 'publish failed' };
  }

  // ── Module 2: ingest pipeline + queue ──────────────────────────────────────
  function resolveTargetsForSource(src) {
    const targets = getTargets();
    const ids = src?.rules?.targets || [];
    const mapped = targets.filter(t => ids.includes(t.id));
    return mapped.length ? mapped : [];
  }

  async function ingestSourcePost(post = {}, options = {}) {
    const settings = getSettings();
    const result = { accepted: false, queued: false, published: false, steps: [], dryRun: settings.dryRun };

    // locate source
    const sources = getSources();
    let src = sources.find(s => s.id === post.sourceId || s.channelId === post.channelId);
    if (!src) { result.steps.push('source-not-registered'); log({ type: 'ingest', status: 'rejected', reason: 'unknown source', post: post.channelId }); return result; }
    if (src.listType === 'blacklist') { result.steps.push('source-blacklisted'); return result; }

    // update health
    updateSource(src.id, { health: { ...(src.health || {}), lastPostAt: nowIso(), postsToday: (src.health?.postsToday || 0) + 1, status: 'active' } });

    // normalize
    const normalized = { text: String(post.text || ''), mediaUrl: post.mediaUrl || '', mediaType: post.mediaType || (post.mediaUrl ? 'image' : 'text'), mediaBytes: post.mediaBytes || 0, sender: post.sender || '', mediaHash: post.mediaHash || '' };
    result.steps.push('normalized');

    // dedupe
    const h = hashPost(normalized);
    if (isDuplicate(h)) { result.steps.push('duplicate'); log({ type: 'ingest', status: 'duplicate', sourceId: src.id }); return result; }

    // safety
    const safety = runSafetyChecks({ ...normalized, depth: post.depth }, src, settings);
    if (!safety.ok) { result.steps.push('safety-failed'); result.reasons = safety.reasons; log({ type: 'ingest', status: 'filtered', sourceId: src.id, reasons: safety.reasons }); markSeen(h); return result; }
    result.steps.push('safety-passed');

    if (src.rules?.autoForward === false) { result.steps.push('auto-forward-off'); return result; }

    markSeen(h);
    result.accepted = true;

    const targets = resolveTargetsForSource(src);
    if (!targets.length) { result.steps.push('no-targets-mapped'); log({ type: 'ingest', status: 'no-targets', sourceId: src.id }); }

    const requireApproval = src.rules?.requireApproval || settings.requireApprovalDefault;
    const queue = getQueue();
    const items = [];
    for (const t of targets) {
      let text = cleanCaption(normalized.text, src, settings);
      text = applyBranding(text, t, src, settings);
      const item = {
        id: uid('q'), ts: nowIso(), sourceId: src.id, sourceName: src.name,
        targetId: t.id, targetName: t.name, platform: t.platform,
        original: normalized.text, content: { text, mediaUrl: normalized.mediaUrl, mediaType: normalized.mediaType, link: post.link || '' },
        status: requireApproval ? 'pending_approval' : 'approved',
        dryRun: settings.dryRun, attempts: 0, hash: h
      };
      items.push(item);
      queue.push(item);
    }
    save(FILES.queue, queue);
    result.queued = items.length > 0;
    result.queueIds = items.map(i => i.id);
    result.steps.push(requireApproval ? 'queued-pending-approval' : 'queued-approved');
    log({ type: 'ingest', status: 'queued', sourceId: src.id, count: items.length, requireApproval });

    // publish immediately if approved + not paused + (drip disabled)
    if (!requireApproval && !settings.paused && !settings.dripIntervalMinutes && options.publishNow !== false) {
      for (const it of items) { await publishQueueItem(it.id); }
      result.published = true;
    }
    return result;
  }

  // ── Queue operations ───────────────────────────────────────────────────────
  function findQueueItem(id) { return getQueue().find(q => q.id === id); }

  function approveQueueItem(id, edits = {}) {
    const queue = getQueue();
    const it = queue.find(q => q.id === id);
    if (!it) return { success: false, error: 'queue item not found' };
    if (edits.text) it.content.text = edits.text;
    if (edits.scheduleAt) it.scheduleAt = edits.scheduleAt;
    it.status = 'approved';
    save(FILES.queue, queue);
    log({ type: 'queue', action: 'approve', id });
    return { success: true, item: it };
  }
  function rejectQueueItem(id, reason = '') {
    const queue = getQueue();
    const it = queue.find(q => q.id === id);
    if (!it) return { success: false, error: 'queue item not found' };
    it.status = 'rejected'; it.reason = reason;
    save(FILES.queue, queue);
    log({ type: 'queue', action: 'reject', id, reason });
    return { success: true, item: it };
  }

  async function publishQueueItem(id) {
    const settings = getSettings();
    const queue = getQueue();
    const it = queue.find(q => q.id === id);
    if (!it) return { success: false, error: 'queue item not found' };
    if (settings.paused) { return { success: false, error: 'automation is paused' }; }
    if (it.status === 'rejected') return { success: false, error: 'item rejected' };
    if (it.status === 'pending_approval') return { success: false, error: 'item awaits approval' };
    const target = getTargets().find(t => t.id === it.targetId);
    if (!target) { it.status = 'failed'; it.reason = 'target missing'; save(FILES.queue, queue); return { success: false, error: 'target missing' }; }

    it.attempts = (it.attempts || 0) + 1;
    const res = await publishWithRetry(target, it.content, settings);
    it.status = res.success ? (settings.dryRun ? 'dry_run_done' : (res.fallback || res.draft ? 'manual_fallback' : 'published')) : 'failed';
    it.lastResult = res;
    save(FILES.queue, queue);
    log({ type: 'publish', id, targetId: target.id, platform: target.platform, status: it.status, dryRun: settings.dryRun, error: res.error || null });
    return res;
  }

  // Drip / scheduled publisher tick (Module 2)
  async function processQueueTick() {
    const settings = getSettings();
    if (settings.paused) return { processed: 0, paused: true };
    const queue = getQueue();
    const now = Date.now();
    const due = queue.filter(q => q.status === 'approved' && (!q.scheduleAt || Date.parse(q.scheduleAt) <= now));
    let processed = 0;
    const batch = settings.dripIntervalMinutes ? due.slice(0, 1) : due; // drip = one at a time
    for (const it of batch) { await publishQueueItem(it.id); processed++; }
    return { processed };
  }

  // ── Module 5: Ecommerce -> channel hooks ───────────────────────────────────
  async function ecommerceEvent(evt = {}) {
    // evt: { type: 'product_added'|'price_drop'|'low_stock'|'flash_sale', product, sourceId }
    const settings = getSettings();
    const templates = {
      product_added: p => `🆕 New: ${p.name}\n💰 ${p.price}\n${p.url || ''}`,
      price_drop: p => `🔥 Price Drop: ${p.name}\nNow ${p.price} (was ${p.oldPrice || ''})\n${p.url || ''}`,
      low_stock: p => `⏳ Limited stock: ${p.name} — order now!\n${p.url || ''}`,
      flash_sale: p => `⚡ FLASH SALE: ${p.name} — ${p.price}\n${p.url || ''}`
    };
    const fn = templates[evt.type];
    if (!fn) return { success: false, error: `unknown ecommerce event "${evt.type}"` };
    const text = fn(evt.product || {});
    return ingestSourcePost({ sourceId: evt.sourceId, channelId: evt.channelId, text, mediaUrl: evt.product?.image, mediaType: evt.product?.image ? 'image' : 'text', link: evt.product?.url }, { publishNow: true });
  }

  // ── Module 10: Health doctor + status + digest ─────────────────────────────
  function status() {
    refreshSourceHealth();
    const sources = getSources(), targets = getTargets(), queue = getQueue();
    const settings = getSettings();
    const todayKey = new Date().toISOString().slice(0, 10);
    const logs = getLogs();
    const forwardedToday = logs.filter(l => l.type === 'publish' && (l.status === 'published' || l.status === 'dry_run_done' || l.status === 'manual_fallback') && (l.ts || '').slice(0, 10) === todayKey).length;
    const failedToday = logs.filter(l => l.type === 'publish' && l.status === 'failed' && (l.ts || '').slice(0, 10) === todayKey).length;
    return {
      mode: settings.dryRun ? 'DRY_RUN' : 'LIVE',
      paused: settings.paused,
      sourcesActive: sources.filter(s => s.health?.status === 'active').length,
      sourcesTotal: sources.length,
      targets: targets.length,
      queuePending: queue.filter(q => q.status === 'approved' || q.status === 'pending_approval').length,
      approvalPending: queue.filter(q => q.status === 'pending_approval').length,
      forwardedToday, failedToday
    };
  }

  function doctor() {
    const sources = getSources(), targets = getTargets(), queue = getQueue();
    const issues = [];
    if (!sources.length) issues.push('No source channels configured.');
    if (!targets.length) issues.push('No target channels configured.');
    const tokenMap = {
      telegram: ['TELEGRAM_BOT_TOKEN'], facebook: ['FB_PAGE_ACCESS_TOKEN'],
      instagram: ['INSTAGRAM_ACCESS_TOKEN'], linkedin: ['LINKEDIN_ACCESS_TOKEN'], tiktok: ['TIKTOK_ACCESS_TOKEN']
    };
    const platformsUsed = [...new Set(targets.map(t => (t.platform || 'whatsapp').toLowerCase()))];
    platformsUsed.forEach(p => {
      (tokenMap[p] || []).forEach(k => { if (!process.env[k]) issues.push(`${p}: missing env ${k}`); });
    });
    const stuck = queue.filter(q => q.status === 'approved' && Date.now() - Date.parse(q.ts) > 36e5);
    if (stuck.length) issues.push(`${stuck.length} queue item(s) stuck >1h (publisher may be down).`);
    const orphans = queue.filter(q => !targets.find(t => t.id === q.targetId));
    if (orphans.length) issues.push(`${orphans.length} queue item(s) point to missing targets.`);
    return { healthy: issues.length === 0, issues, platformsUsed, checkedAt: nowIso() };
  }

  function digest() {
    const s = status();
    const d = doctor();
    return [
      '📊 *Channel Automation Digest*',
      `Mode: ${s.mode}${s.paused ? ' (PAUSED)' : ''}`,
      `Sources: ${s.sourcesActive}/${s.sourcesTotal} active`,
      `Targets: ${s.targets}`,
      `Queue pending: ${s.queuePending} (approval: ${s.approvalPending})`,
      `Forwarded today: ${s.forwardedToday} | Failed: ${s.failedToday}`,
      d.healthy ? '✅ Health: OK' : `⚠️ Issues:\n- ${d.issues.join('\n- ')}`
    ].join('\n');
  }

  // ── Config export / import ──────────────────────────────────────────────────
  function exportConfig() {
    return { version: 1, exportedAt: nowIso(), settings: getSettings(), sources: getSources(), targets: getTargets() };
  }
  function importConfig(cfg = {}) {
    if (cfg.settings) save(FILES.settings, { ...DEFAULT_SETTINGS, ...cfg.settings });
    if (Array.isArray(cfg.sources)) save(FILES.sources, cfg.sources);
    if (Array.isArray(cfg.targets)) save(FILES.targets, cfg.targets);
    return { success: true, sources: (cfg.sources || []).length, targets: (cfg.targets || []).length };
  }

  function manualPackets() { return load(FILES.packets, []); }
  function markPacketDone(id) {
    const packets = load(FILES.packets, []);
    const it = packets.find(p => p.id === id);
    if (it) { it.status = 'done'; save(FILES.packets, packets); }
    return { success: !!it };
  }

  function pauseAll() { return setSettings({ paused: true }); }
  function resumeAll() { return setSettings({ paused: false }); }
  function setDryRun(on) { return setSettings({ dryRun: !!on }); }

  // Daily cleanup / archive (Module 10)
  function cleanup() {
    const logs = getLogs();
    const cutoff = Date.now() - 30 * 864e5;
    const kept = logs.filter(l => Date.parse(l.ts) >= cutoff);
    save(FILES.logs, kept);
    return { removed: logs.length - kept.length };
  }

  // ── Module 7: WhatsApp admin command router ────────────────────────────────
  async function handleAdminCommand(command, args = []) {
    const cmd = String(command || '').toLowerCase();
    switch (cmd) {
      case '!channelstatus': {
        const s = status();
        return `📡 *Channel Status*\nMode: ${s.mode}${s.paused ? ' (PAUSED)' : ''}\nSources: ${s.sourcesActive}/${s.sourcesTotal} active\nTargets: ${s.targets}\nQueue: ${s.queuePending} (approval ${s.approvalPending})\nAaj forwarded: ${s.forwardedToday}, failed: ${s.failedToday}`;
      }
      case '!channelsources': {
        const list = getSources();
        if (!list.length) return 'Koi source channel nahi mila. !addsource [name] [channelId] use karein.';
        return '📥 *Sources:*\n' + list.map(s => `• ${s.name} [${s.id}] — ${s.health?.status || 'unknown'} → ${s.rules?.targets?.length || 0} target(s)`).join('\n');
      }
      case '!channeltargets': {
        const list = getTargets();
        if (!list.length) return 'Koi target channel nahi. !addtarget [name] [channelId] use karein.';
        return '📤 *Targets:*\n' + list.map(t => `• ${t.name} [${t.id}] — ${t.platform}`).join('\n');
      }
      case '!channelqueue': {
        const q = getQueue().filter(x => x.status === 'approved' || x.status === 'pending_approval').slice(-15);
        if (!q.length) return 'Queue khali hai ✅';
        return '🗂️ *Queue:*\n' + q.map(x => `• [${x.id}] ${x.status} → ${x.targetName}`).join('\n');
      }
      case '!channelapprove': {
        if (!args[0]) return 'Usage: !channelapprove [queueId]';
        const r = approveQueueItem(args[0]);
        return r.success ? `✅ Approved ${args[0]}. Publish ke liye !channelpublish ${args[0]}` : `❌ ${r.error}`;
      }
      case '!channelreject': {
        if (!args[0]) return 'Usage: !channelreject [queueId]';
        const r = rejectQueueItem(args[0], args.slice(1).join(' '));
        return r.success ? `🚫 Rejected ${args[0]}` : `❌ ${r.error}`;
      }
      case '!channelpublish': {
        if (!args[0]) return 'Usage: !channelpublish [queueId]';
        const r = await publishQueueItem(args[0]);
        return r.success ? `📨 Published ${args[0]} (${r.dryRun ? 'DRY-RUN' : r.fallback ? 'manual packet' : r.draft ? 'draft' : 'live'})` : `❌ ${r.error}${r.fix ? ' — ' + r.fix : ''}`;
      }
      case '!pausechannels': { pauseAll(); return '⏸️ Channel automation PAUSED. Resume: !resumechannels'; }
      case '!resumechannels': { resumeAll(); return '▶️ Channel automation RESUMED.'; }
      case '!addsource': {
        if (args.length < 2) return 'Usage: !addsource [name] [channelId]';
        const rec = addSource({ name: args[0], channelId: args.slice(1).join(' ') });
        return `✅ Source added: ${rec.name} [${rec.id}]`;
      }
      case '!addtarget': {
        if (args.length < 2) return 'Usage: !addtarget [name] [channelId]';
        const rec = addTarget({ name: args[0], channelId: args.slice(1).join(' ') });
        return `✅ Target added: ${rec.name} [${rec.id}]`;
      }
      case '!route': {
        if (args.length < 2) return 'Usage: !route [sourceId] [targetId]';
        const src = getSources().find(s => s.id === args[0]);
        if (!src) return `❌ Source ${args[0]} nahi mila`;
        const targets = new Set(src.rules.targets || []); targets.add(args[1]);
        updateSource(src.id, { rules: { targets: [...targets] } });
        return `🔗 Route set: ${args[0]} → ${args[1]}`;
      }
      case '!digest': return digest();
      case '!channeldoctor': {
        const d = doctor();
        return d.healthy ? '✅ Channel doctor: sab theek hai.' : `🩺 *Channel Doctor:*\n- ${d.issues.join('\n- ')}`;
      }
      default: return `Unknown channel command: ${cmd}`;
    }
  }

  const ADMIN_COMMANDS = ['!channelstatus', '!channelsources', '!channeltargets', '!channelqueue', '!channelapprove', '!channelreject', '!channelpublish', '!pausechannels', '!resumechannels', '!addsource', '!addtarget', '!route', '!digest', '!channeldoctor'];
  function isAdminCommand(text) {
    const c = String(text || '').trim().split(/\s+/)[0].toLowerCase();
    return ADMIN_COMMANDS.includes(c);
  }

  // optional background drip publisher (guarded, unref'd, never crashes server)
  let timer = null;
  function startScheduler() {
    if (timer) return;
    timer = setInterval(() => {
      try {
        const s = getSettings();
        if (s.dripIntervalMinutes && !s.paused) processQueueTick().catch(() => {});
      } catch (_) {}
    }, 60 * 1000);
    if (timer.unref) timer.unref();
  }
  function stopScheduler() { if (timer) { clearInterval(timer); timer = null; } }

  return {
    // managers
    getSources, addSource, updateSource, removeSource, refreshSourceHealth,
    getTargets, addTarget, updateTarget, removeTarget,
    // pipeline / queue
    ingestSourcePost, getQueue, findQueueItem, approveQueueItem, rejectQueueItem, publishQueueItem, processQueueTick,
    // ecommerce
    ecommerceEvent,
    // settings / control
    getSettings, setSettings, pauseAll, resumeAll, setDryRun,
    // reporting
    status, doctor, digest, getLogs, cleanup,
    // config
    exportConfig, importConfig,
    // manual packets
    manualPackets, markPacketDone,
    // admin commands
    handleAdminCommand, isAdminCommand, ADMIN_COMMANDS,
    // scheduler
    startScheduler, stopScheduler,
    // internals exposed for tests
    _internal: { cleanCaption, applyBranding, runSafetyChecks, hashPost, FILES, DEFAULT_SETTINGS }
  };
}

module.exports = { createChannelAutomationCenter };
