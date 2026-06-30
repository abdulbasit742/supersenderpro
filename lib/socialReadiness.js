// lib/socialReadiness.js
// Reusable social media production readiness report builder.
// Used by scripts/socialMediaReadiness.js CLI and GET /api/social/readiness endpoint.
// No external dependencies — pure Node built-ins only.

"use strict";

const fs   = require("fs");
const path = require("path");

const SOCIAL_PLATFORMS = ["facebook", "instagram", "linkedin"];

const REQUIRED_ENV_KEYS = [
  "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_PAGE_ID",
  "FB_PAGE_ACCESS_TOKEN", "FB_VERIFY_TOKEN",
  "INSTAGRAM_IG_USER_ID", "INSTAGRAM_ACCESS_TOKEN",
  "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET",
  "LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN",
  "SOCIAL_PUBLIC_BASE_URL", "SOCIAL_AUTO_POST_DIR"
];

const SOCIAL_DIRS = [
  "social-auto-posts",
  "social-auto-posts/inbox",
  "social-auto-posts/queued",
  "social-auto-posts/posted",
  "social-auto-posts/failed",
  "social-auto-posts/media",
  "video-auto-posts",
  "video-auto-posts/inbox",
  "video-auto-posts/generated",
  "video-auto-posts/assets",
  "video-auto-posts/posted",
  "video-auto-posts/failed"
];

const DATA_FILES = [
  "social_accounts.json",
  "social_posts.json",
  "social_events.json",
  "social_auto_posts.json",
  "video_auto_posts.json",
  "video_ai_providers.json"
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return { __parseError: error.message };
  }
}

/** Mask a token/secret so it is safe to return over an API */
function mask(value) {
  if (!value) return "";
  const text = String(value);
  if (text.length <= 8) return text.slice(0, 2) + "***";
  return text.slice(0, 4) + "..." + text.slice(-4);
}

function hasUsableValue(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return Boolean(text) && !/^(changeme|replace|todo|null|undefined|your_|example)/i.test(text);
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function addCheck(checks, level, name, passed, details, recommendation) {
  checks.push({
    level,
    name,
    passed: Boolean(passed),
    details: details || "",
    recommendation: recommendation || ""
  });
}

function accountConfigured(account) {
  if (!account || !hasUsableValue(account.accessToken)) return false;
  if (account.platform === "facebook") return hasUsableValue(account.pageId || account.facebookPageId);
  if (account.platform === "instagram") return hasUsableValue(account.igUserId || account.instagramIgUserId);
  if (account.platform === "linkedin") return hasUsableValue(account.authorUrn || account.linkedinAuthorUrn);
  return false;
}

function countByStatus(rows) {
  const counts = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = row.status || row.type || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// ── Core report builder ───────────────────────────────────────────────────────

/**
 * Build a complete social readiness report.
 *
 * @param {object} opts
 * @param {string} [opts.rootDir] - Repo root. Defaults to two levels up from lib/.
 * @returns {object} report - JSON-serialisable readiness report.
 */
function buildSocialReadinessReport(opts) {
  const rootDir = (opts && opts.rootDir) ? opts.rootDir : path.join(__dirname, "..");
  const dataDir  = path.join(rootDir, "data");

  const envFile        = path.join(rootDir, ".env");
  const envExampleFile = path.join(rootDir, ".env.example");
  const settingsFile   = path.join(dataDir,  "settings.json");

  const env            = { ...readEnv(envExampleFile), ...readEnv(envFile) };
  const envExample     = readEnv(envExampleFile);
  const settings       = readJSON(settingsFile, {});
  const socialAccounts = readJSON(path.join(dataDir, "social_accounts.json"),   []);
  const socialPosts    = readJSON(path.join(dataDir, "social_posts.json"),       []);
  const socialEvents   = readJSON(path.join(dataDir, "social_events.json"),      []);
  const autoPosts      = readJSON(path.join(dataDir, "social_auto_posts.json"),  []);
  const videoPosts     = readJSON(path.join(dataDir, "video_auto_posts.json"),   []);
  const videoProviders = readJSON(path.join(dataDir, "video_ai_providers.json"), []);

  const checks = [];

  // --- env file ---
  addCheck(checks, "critical", ".env or .env.example exists",
    fs.existsSync(envFile) || fs.existsSync(envExampleFile),
    fs.existsSync(envFile) ? ".env found"
      : fs.existsSync(envExampleFile) ? ".env.example found"
      : "No env file found",
    "Create .env from .env.example and keep real tokens local only."
  );

  // --- required env keys ---
  for (const key of REQUIRED_ENV_KEYS) {
    const declared = Object.prototype.hasOwnProperty.call(envExample, key) ||
                     Object.prototype.hasOwnProperty.call(env, key);
    const configured = hasUsableValue(env[key]);
    // IMPORTANT: only mask — never expose the raw token value
    const details = configured ? `configured (${mask(env[key])})` : "declared but not configured";
    addCheck(checks,
      (key.includes("TOKEN") || key.includes("SECRET")) ? "warning" : "info",
      `Env key declared: ${key}`,
      declared,
      details,
      `Add ${key} to .env when the real platform app is ready.`
    );
  }

  // --- data files ---
  for (const file of DATA_FILES) {
    const value = readJSON(path.join(dataDir, file), []);
    addCheck(checks, "critical", `Data file valid: ${file}`,
      !value.__parseError,
      value.__parseError ? value.__parseError
        : `${Array.isArray(value) ? value.length : Object.keys(value || {}).length} records`,
      `Run npm run health to create or repair data/${file}.`
    );
  }

  // --- directories ---
  for (const dir of SOCIAL_DIRS) {
    addCheck(checks,
      dir.includes("/inbox") ? "warning" : "info",
      `Directory exists: ${dir}`,
      fs.existsSync(path.join(rootDir, dir)),
      fs.existsSync(path.join(rootDir, dir)) ? "found" : "missing",
      `Create ${dir} or run the existing setup/health scripts.`
    );
  }

  // --- public base URL ---
  const publicBaseUrl =
    env.SOCIAL_PUBLIC_BASE_URL ||
    settings.social_public_base_url ||
    settings.SOCIAL_PUBLIC_BASE_URL ||
    "";
  addCheck(checks, "critical", "Social public base URL is HTTPS",
    isHttpsUrl(publicBaseUrl),
    publicBaseUrl || "not configured",
    "Set SOCIAL_PUBLIC_BASE_URL to your public HTTPS domain or tunnel URL."
  );

  // --- platform account checks ---
  const accounts = Array.isArray(socialAccounts) ? socialAccounts : [];
  for (const platform of SOCIAL_PLATFORMS) {
    const rows      = accounts.filter((row) => row.platform === platform);
    const readyRows = rows.filter(accountConfigured);
    addCheck(checks, "critical", `${platform} account ready`,
      readyRows.length > 0,
      `${readyRows.length}/${rows.length} configured`,
      `Use /social dashboard to save a ${platform} account with token and required IDs.`
    );
  }

  // --- instagram media ---
  const instagramReadyForMedia =
    accounts.some((row) => row.platform === "instagram" && accountConfigured(row)) &&
    isHttpsUrl(publicBaseUrl);
  addCheck(checks, "critical", "Instagram media publishing ready",
    instagramReadyForMedia,
    instagramReadyForMedia
      ? "IG account + HTTPS media URL ready"
      : "Needs IG account and public HTTPS media URL",
    "Connect Instagram Business account and expose /social-auto-media over HTTPS."
  );

  // --- video provider ---
  const videoProviderReady =
    Array.isArray(videoProviders) &&
    videoProviders.some((p) => p.enabled !== false && hasUsableValue(p.apiUrl) && hasUsableValue(p.apiKey));
  addCheck(checks, "warning", "AI video provider ready",
    videoProviderReady,
    `${Array.isArray(videoProviders) ? videoProviders.length : 0} providers saved`,
    "Save Runway/Pika/Luma/Kling or another provider from the Social dashboard."
  );

  // --- auto-poster ---
  const autoPosterEnabled = settings.social_auto_poster_enabled !== false;
  addCheck(checks, "warning", "Social auto-poster enabled",
    autoPosterEnabled,
    `social_auto_poster_enabled=${settings.social_auto_poster_enabled}`,
    "Set social_auto_poster_enabled=true in settings.json or .env for scheduled folder posting."
  );

  // --- recent failures ---
  const recentFailures = [
    ...((Array.isArray(socialPosts) ? socialPosts : []).filter((r) => ["failed","blocked","partial"].includes(r.status))),
    ...((Array.isArray(autoPosts)   ? autoPosts   : []).filter((r) => ["failed","blocked","partial"].includes(r.status))),
    ...((Array.isArray(videoPosts)  ? videoPosts  : []).filter((r) => ["failed","blocked","partial"].includes(r.status)))
  ].slice(-10);
  addCheck(checks, "warning", "No recent blocked/failed social jobs",
    recentFailures.length === 0,
    `${recentFailures.length} recent blocked/failed/partial jobs detected`,
    "Open /social, inspect Recent Social Posts and retry blocked jobs after adding tokens."
  );

  // --- totals + score ---
  const totals = {
    checks:         checks.length,
    passed:         checks.filter((c) => c.passed).length,
    failed:         checks.filter((c) => !c.passed).length,
    criticalFailed: checks.filter((c) => !c.passed && c.level === "critical").length,
    warningFailed:  checks.filter((c) => !c.passed && c.level === "warning").length
  };

  const score = Math.round((totals.passed / Math.max(1, totals.checks)) * 100);
  const readiness =
    totals.criticalFailed === 0 && score >= 85 ? "production-ready"
    : score >= 65 ? "staging-ready"
    : "needs-work";

  return {
    generatedAt: new Date().toISOString(),
    project:  "SuperSender Pro",
    module:   "Social Media Automation",
    readiness,
    score,
    totals,
    summary: {
      socialAccounts:     accounts.length,
      configuredAccounts: accounts.filter(accountConfigured).length,
      postsByStatus:      countByStatus(socialPosts),
      autoPosterByStatus: countByStatus(autoPosts),
      videoJobsByStatus:  countByStatus(videoPosts),
      eventsByType:       countByStatus(socialEvents),
      videoProviders:     Array.isArray(videoProviders) ? videoProviders.length : 0,
      publicBaseUrl:      publicBaseUrl || ""
    },
    checks,
    nextSteps: checks
      .filter((c) => !c.passed)
      .slice(0, 12)
      .map((c) => ({ name: c.name, level: c.level, recommendation: c.recommendation }))
  };
}

module.exports = { buildSocialReadinessReport };