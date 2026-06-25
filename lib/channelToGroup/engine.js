// lib/channelToGroup/engine.js
// Channel-to-Group Auto Share Engine
// Posts from WhatsApp channels auto-share to selected groups based on user-defined parameters.
// Dry-run ON by default — no live sends until CHANNEL_TO_GROUP_DRY_RUN=false

"use strict";
const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE     = "channel_to_group_rules.json";
const LOG_FILE      = "channel_to_group_logs.json";
const QUEUE_FILE    = "channel_to_group_queue.json";

const DRY_RUN = !["0","false","no"].includes(String(process.env.CHANNEL_TO_GROUP_DRY_RUN || "1").toLowerCase());

function nowIso()      { return new Date().toISOString(); }
function uid(p="r")    { return p + "_" + Date.now().toString(36) + "_" + crypto.randomBytes(3).toString("hex"); }

// ── Persistence ───────────────────────────────────────────────────────────────
function dataDir() {
  const d = path.join(__dirname, "../../data");
  try { fs.mkdirSync(d, { recursive: true }); } catch(_) {}
  return d;
}
function load(file, def) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir(), file), "utf8")); }
  catch(_) { return def; }
}
function save(file, data) {
  try { fs.writeFileSync(path.join(dataDir(), file), JSON.stringify(data, null, 2), "utf8"); }
  catch(e) { console.error("[ChannelToGroup] save error:", e.message); }
}

// ── Rule model ────────────────────────────────────────────────────────────────
// Rule = {
//   id, name, enabled,
//   sourceChannelId,   // WhatsApp channel/newsletter JID e.g. "120363xxx@newsletter"
//   targetGroups: [],  // array of group JIDs e.g. ["120363yyy@g.us"]
//   filter: {
//     keywords: [],        // post must contain at least one keyword (empty = all posts)
//     excludeKeywords: [], // skip if post contains any of these
//     mediaOnly: false,    // only posts with media
//     textOnly: false,     // only text posts
//     minLength: 0,        // minimum text length
//     maxLength: 0,        // 0 = no limit
//   },
//   transform: {
//     addHeader: "",       // prepend this text
//     addFooter: "",       // append this text
//     replaceLinks: false, // strip URLs
//     stripHashtags: false,
//     customCaption: "",   // if set, replace caption entirely
//   },
//   schedule: {
//     enabled: false,
//     timeStart: "08:00",  // HH:MM Pakistan time
//     timeEnd: "22:00",
//     daysOfWeek: [0,1,2,3,4,5,6], // 0=Sun
//   },
//   delay: { minSec: 2, maxSec: 8 },  // random delay between group sends
//   dryRun: true,
//   createdAt, updatedAt, stats: { sent, skipped, failed }
// }

function defaultRule(input = {}) {
  return {
    id: input.id || uid("rule"),
    name: input.name || "New Rule",
    enabled: input.enabled !== false,
    sourceChannelId: input.sourceChannelId || "",
    targetGroups: Array.isArray(input.targetGroups) ? input.targetGroups : [],
    filter: {
      keywords:        (input.filter && Array.isArray(input.filter.keywords))        ? input.filter.keywords        : [],
      excludeKeywords: (input.filter && Array.isArray(input.filter.excludeKeywords)) ? input.filter.excludeKeywords : [],
      mediaOnly:       (input.filter && input.filter.mediaOnly)  || false,
      textOnly:        (input.filter && input.filter.textOnly)   || false,
      minLength:       (input.filter && Number(input.filter.minLength)) || 0,
      maxLength:       (input.filter && Number(input.filter.maxLength)) || 0,
    },
    transform: {
      addHeader:     (input.transform && input.transform.addHeader)     || "",
      addFooter:     (input.transform && input.transform.addFooter)     || "",
      replaceLinks:  (input.transform && input.transform.replaceLinks)  || false,
      stripHashtags: (input.transform && input.transform.stripHashtags) || false,
      customCaption: (input.transform && input.transform.customCaption) || "",
    },
    schedule: {
      enabled:    (input.schedule && input.schedule.enabled)    || false,
      timeStart:  (input.schedule && input.schedule.timeStart)  || "08:00",
      timeEnd:    (input.schedule && input.schedule.timeEnd)    || "22:00",
      daysOfWeek: (input.schedule && Array.isArray(input.schedule.daysOfWeek)) ? input.schedule.daysOfWeek : [0,1,2,3,4,5,6],
    },
    delay: {
      minSec: (input.delay && Number(input.delay.minSec)) || 2,
      maxSec: (input.delay && Number(input.delay.maxSec)) || 8,
    },
    dryRun: input.dryRun !== undefined ? !!input.dryRun : DRY_RUN,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    stats: { sent: 0, skipped: 0, failed: 0 },
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
function getRules()        { return load(DATA_FILE, []); }
function getRule(id)       { return getRules().find(r => r.id === id) || null; }

function createRule(input) {
  const rules = getRules();
  const rule = defaultRule(input);
  rules.push(rule);
  save(DATA_FILE, rules);
  return rule;
}

function updateRule(id, patch) {
  const rules = getRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx < 0) return null;
  const current = rules[idx];
  rules[idx] = {
    ...current,
    ...patch,
    filter:    Object.assign({}, current.filter,    patch.filter    || {}),
    transform: Object.assign({}, current.transform, patch.transform || {}),
    schedule:  Object.assign({}, current.schedule,  patch.schedule  || {}),
    delay:     Object.assign({}, current.delay,     patch.delay     || {}),
    targetGroups: patch.targetGroups !== undefined ? patch.targetGroups : current.targetGroups,
    updatedAt: nowIso(),
    id,
  };
  save(DATA_FILE, rules);
  return rules[idx];
}

function deleteRule(id) {
  const rules = getRules().filter(r => r.id !== id);
  save(DATA_FILE, rules);
}

function toggleRule(id, enabled) {
  return updateRule(id, { enabled });
}

// ── Queue ─────────────────────────────────────────────────────────────────────
function getQueue()  { return load(QUEUE_FILE, []); }
function addToQueue(item) {
  const q = getQueue();
  q.push({ id: uid("qi"), ...item, queuedAt: nowIso(), status: "pending" });
  save(QUEUE_FILE, q);
}
function clearQueueItem(id) {
  save(QUEUE_FILE, getQueue().filter(q => q.id !== id));
}

// ── Logging ───────────────────────────────────────────────────────────────────
function addLog(entry) {
  const logs = load(LOG_FILE, []);
  logs.push({ id: uid("log"), ts: nowIso(), ...entry });
  if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  save(LOG_FILE, logs);
}
function getLogs(limit = 100) { return load(LOG_FILE, []).slice(-limit); }

// ── Filter logic ──────────────────────────────────────────────────────────────
function passesFilter(text, media, rule) {
  const f = rule.filter || {};
  const t = (text || "").toLowerCase();

  if (f.mediaOnly && !media)  return { pass: false, reason: "mediaOnly: no media" };
  if (f.textOnly  && media)   return { pass: false, reason: "textOnly: has media" };

  if (f.minLength && t.length < f.minLength) return { pass: false, reason: `minLength: ${t.length} < ${f.minLength}` };
  if (f.maxLength && t.length > f.maxLength) return { pass: false, reason: `maxLength: ${t.length} > ${f.maxLength}` };

  if (f.keywords && f.keywords.length > 0) {
    const hit = f.keywords.some(kw => t.includes(kw.toLowerCase()));
    if (!hit) return { pass: false, reason: "keywords: no match" };
  }

  if (f.excludeKeywords && f.excludeKeywords.length > 0) {
    const blocked = f.excludeKeywords.find(kw => t.includes(kw.toLowerCase()));
    if (blocked) return { pass: false, reason: `excludeKeywords: blocked by "${blocked}"` };
  }

  return { pass: true };
}

// ── Schedule check ────────────────────────────────────────────────────────────
function isInSchedule(rule) {
  if (!rule.schedule || !rule.schedule.enabled) return true;
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  const day = now.getDay(); // 0=Sun
  const days = rule.schedule.daysOfWeek || [0,1,2,3,4,5,6];
  if (!days.includes(day)) return false;
  const hhmm = now.getHours().toString().padStart(2,"0") + ":" + now.getMinutes().toString().padStart(2,"0");
  return hhmm >= (rule.schedule.timeStart || "00:00") && hhmm <= (rule.schedule.timeEnd || "23:59");
}

// ── Transform ─────────────────────────────────────────────────────────────────
function applyTransform(text, rule) {
  const tr = rule.transform || {};
  let out = text || "";

  if (tr.customCaption) return tr.customCaption;
  if (tr.replaceLinks)  out = out.replace(/https?:\/\/\S+/gi, "");
  if (tr.stripHashtags) out = out.replace(/#\w+/g, "");
  out = out.trim();
  if (tr.addHeader)     out = tr.addHeader + "\n\n" + out;
  if (tr.addFooter)     out = out + "\n\n" + tr.addFooter;
  return out.trim();
}

// ── Main processor — called when a channel post arrives ─────────────────────
// waClient = the WhatsApp client instance (Baileys/wwebjs) passed from server.js
async function processPost({ channelId, text, mediaUrl, mediaType, messageId, fromMe }, waClient) {
  const rules = getRules().filter(r => r.enabled && r.sourceChannelId);

  // Match rules for this channel
  const matched = rules.filter(r => {
    // support exact JID match OR partial contains
    const src = (r.sourceChannelId || "").toLowerCase();
    const ch  = (channelId || "").toLowerCase();
    return ch === src || ch.includes(src) || src.includes(ch);
  });

  if (!matched.length) return { processed: 0 };

  let totalSent = 0, totalSkipped = 0, totalFailed = 0;

  for (const rule of matched) {
    const filterResult = passesFilter(text, mediaUrl, rule);

    if (!filterResult.pass) {
      totalSkipped++;
      addLog({ type: "skip", ruleId: rule.id, ruleName: rule.name, channelId, reason: filterResult.reason });
      updateRuleStats(rule.id, "skipped");
      continue;
    }

    if (!isInSchedule(rule)) {
      totalSkipped++;
      addLog({ type: "skip", ruleId: rule.id, ruleName: rule.name, channelId, reason: "outside schedule window" });
      updateRuleStats(rule.id, "skipped");
      if (rule.schedule && rule.schedule.enabled) {
        // Queue for later
        addToQueue({ ruleId: rule.id, channelId, text, mediaUrl, mediaType, messageId });
      }
      continue;
    }

    const finalText = applyTransform(text, rule);

    if (!rule.targetGroups || rule.targetGroups.length === 0) {
      addLog({ type: "skip", ruleId: rule.id, ruleName: rule.name, reason: "no target groups configured" });
      totalSkipped++;
      continue;
    }

    // Send to each target group
    for (const groupId of rule.targetGroups) {
      const delayMs = ((rule.delay && rule.delay.minSec) || 2) * 1000
        + Math.random() * (((rule.delay && rule.delay.maxSec) || 8) - ((rule.delay && rule.delay.minSec) || 2)) * 1000;

      if (rule.dryRun || DRY_RUN) {
        addLog({ type: "dry_run", ruleId: rule.id, ruleName: rule.name, channelId, groupId, text: finalText, mediaUrl, mediaType, delayMs: Math.round(delayMs) });
        totalSent++;
        continue;
      }

      try {
        await sleep(delayMs);
        if (waClient && typeof waClient.sendMessage === "function") {
          if (mediaUrl && mediaType) {
            await waClient.sendMessage(groupId, { caption: finalText, [mediaType]: { url: mediaUrl } });
          } else {
            await waClient.sendMessage(groupId, { text: finalText });
          }
          addLog({ type: "sent", ruleId: rule.id, ruleName: rule.name, channelId, groupId, text: finalText.slice(0, 120), mediaUrl: mediaUrl || null });
          totalSent++;
          updateRuleStats(rule.id, "sent");
        } else {
          throw new Error("waClient not available or sendMessage not a function");
        }
      } catch(e) {
        addLog({ type: "failed", ruleId: rule.id, ruleName: rule.name, channelId, groupId, error: e.message });
        totalFailed++;
        updateRuleStats(rule.id, "failed");
      }
    }
  }

  return { processed: matched.length, totalSent, totalSkipped, totalFailed };
}

// Process queued items (call on a cron or on demand)
async function processQueue(waClient) {
  const queue = getQueue().filter(q => q.status === "pending");
  let processed = 0;
  for (const item of queue) {
    const rule = getRule(item.ruleId);
    if (!rule || !rule.enabled) { clearQueueItem(item.id); continue; }
    if (!isInSchedule(rule)) continue;
    await processPost({ channelId: item.channelId, text: item.text, mediaUrl: item.mediaUrl, mediaType: item.mediaType, messageId: item.messageId }, waClient);
    clearQueueItem(item.id);
    processed++;
  }
  return { processed };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateRuleStats(id, field) {
  const rules = getRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx < 0) return;
  if (!rules[idx].stats) rules[idx].stats = { sent:0, skipped:0, failed:0 };
  rules[idx].stats[field] = (rules[idx].stats[field] || 0) + 1;
  save(DATA_FILE, rules);
}

function getStats() {
  const rules = getRules();
  return {
    totalRules: rules.length,
    enabledRules: rules.filter(r => r.enabled).length,
    dryRunRules: rules.filter(r => r.dryRun).length,
    liveRules: rules.filter(r => !r.dryRun).length,
    queuedItems: getQueue().length,
    recentLogs: getLogs(20),
    globalDryRun: DRY_RUN,
  };
}

module.exports = { createRule, getRules, getRule, updateRule, deleteRule, toggleRule, processPost, processQueue, getLogs, getQueue, getStats };