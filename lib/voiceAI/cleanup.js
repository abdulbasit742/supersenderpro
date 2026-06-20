// lib/voiceAI/cleanup.js — Removes stale audio files + old queue items per retention policy.
// Operates only inside the configured audio store dir; never touches anything else.

const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { readJSON, writeJSON } = require('./jsonStore');

function cleanAudio() {
  const dir = config.paths.audioStore;
  const removed = [];
  try {
    if (!fs.existsSync(dir)) return { removed };
    const cutoff = Date.now() - config.cleanupDays * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      try {
        const st = fs.statSync(full);
        if (st.isFile() && st.mtimeMs < cutoff) { fs.unlinkSync(full); removed.push(f); }
      } catch (_e) { /* ignore */ }
    }
  } catch (_e) { /* ignore */ }
  return { removed };
}

function archiveStaleQueue() {
  const d = readJSON(config.paths.queue, { items: [] });
  const cutoff = Date.now() - config.cleanupDays * 24 * 60 * 60 * 1000;
  let archived = 0;
  (d.items || []).forEach((i) => {
    if (['approval_pending', 'approved'].includes(i.status) && new Date(i.createdAt).getTime() < cutoff) {
      i.status = 'archived'; archived += 1;
    }
  });
  writeJSON(config.paths.queue, d);
  return { archived };
}

module.exports = { cleanAudio, archiveStaleQueue };
