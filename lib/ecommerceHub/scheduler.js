'use strict';

/**
 * Ecommerce Hub — scheduled broadcasts (no external cron).
 * schedule(): queue a message to send at a future time (optionally to a
 * platform-filtered audience). runDue(): send everything whose time has passed
 * (call from your existing interval/loop, or hit the /scheduler/run endpoint).
 * Opt-out + dry-run handled by broadcast.js. Persistent JSON queue.
 */

const fs = require('fs');
const path = require('path');
const broadcast = require('./broadcast');

function storePath() { const p = process.env.ECOMMERCE_HUB_SCHED_PATH || 'data/ecommerce-scheduled.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, jobs: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!Array.isArray(s.jobs)) s.jobs = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function schedule(opts) {
  opts = opts || {};
  if (!opts.message || !String(opts.message).trim()) return { ok: false, error: 'message_required' };
  const at = opts.at ? new Date(opts.at).getTime() : Date.now();
  if (isNaN(at)) return { ok: false, error: 'invalid_at' };
  const s = read();
  const job = { id: 'job' + Date.now() + Math.floor(Math.random() * 1000), message: String(opts.message), platform: opts.platform || null, at: at, status: 'pending', createdAt: Date.now() };
  s.jobs.push(job); write(s);
  return { ok: true, job: job };
}

async function runDue() {
  const s = read();
  const now = Date.now();
  const out = [];
  for (const job of s.jobs) {
    if (job.status !== 'pending' || job.at > now) continue;
    const r = await broadcast.send(job.message, job.platform ? { platform: job.platform } : {});
    job.status = 'sent'; job.sentAt = Date.now(); job.result = { sent: r.sent, skippedOptOut: r.skippedOptOut };
    out.push({ job: job.id, result: job.result });
  }
  write(s);
  return { ok: true, ran: out.length, details: out };
}

function list() { return read().jobs; }
function cancel(id) { const s = read(); const j = s.jobs.find(function (x) { return x.id === id; }); if (j && j.status === 'pending') { j.status = 'cancelled'; write(s); return true; } return false; }

module.exports = { schedule, runDue, list, cancel };
