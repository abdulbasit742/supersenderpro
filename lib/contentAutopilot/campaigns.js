// lib/contentAutopilot/campaigns.js
// Recurring content campaigns: the true 'set and forget' layer.
// Define a campaign once (topic/theme, platforms, cadence) and the scheduler
// auto-generates fresh AI content + queues it every `everyHours`.
//
// Storage: a single JSON file under data/ (matches repo's JSON-store style).
// No new dependency.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'content_campaigns.json');

function ensure() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
function readAll() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return []; }
}
function writeAll(list) { ensure(); fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8'); return list; }

// Create a recurring campaign.
// { topic, platforms:[], tone, everyHours (number), active:true }
function createCampaign({ topic, platforms, tone, everyHours } = {}) {
  if (!topic || !String(topic).trim()) throw new Error('topic is required');
  const hours = Number(everyHours) > 0 ? Number(everyHours) : 24;
  const camp = {
    id: 'CAMP-' + crypto.randomBytes(5).toString('hex'),
    topic: String(topic).trim(),
    platforms: Array.isArray(platforms) && platforms.length ? platforms : ['instagram'],
    tone: tone || 'friendly',
    everyHours: hours,
    active: true,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
  };
  const list = readAll();
  list.push(camp);
  writeAll(list);
  return camp;
}

function listCampaigns() { return readAll(); }

function toggleCampaign(id, active) {
  const list = readAll();
  const c = list.find((x) => x.id === id);
  if (!c) throw new Error('campaign not found: ' + id);
  c.active = active === undefined ? !c.active : !!active;
  writeAll(list);
  return c;
}

function deleteCampaign(id) {
  const list = readAll();
  const next = list.filter((x) => x.id !== id);
  writeAll(next);
  return { ok: true, removed: list.length - next.length };
}

function isDue(camp, now) {
  if (!camp.active) return false;
  if (!camp.lastRunAt) return true;
  return (now - new Date(camp.lastRunAt).getTime()) >= camp.everyHours * 3600 * 1000;
}

// Expand all due campaigns into queued jobs. Called by the scheduler tick.
// `orchestrator` is lib/contentAutopilot (passed in to avoid a require cycle).
async function runDueCampaigns(orchestrator, now) {
  const t = now || Date.now();
  const list = readAll();
  const ran = [];
  for (const camp of list) {
    if (!isDue(camp, t)) continue;
    try {
      const jobs = await orchestrator.generateContent({
        topic: camp.topic,
        platforms: camp.platforms,
        tone: camp.tone,
      });
      camp.lastRunAt = new Date(t).toISOString();
      ran.push({ id: camp.id, created: jobs.length });
    } catch (e) {
      ran.push({ id: camp.id, error: e.message });
    }
  }
  writeAll(list);
  return { expanded: ran.length, details: ran };
}

module.exports = { createCampaign, listCampaigns, toggleCampaign, deleteCampaign, runDueCampaigns, isDue };
