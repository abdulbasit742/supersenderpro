'use strict';
async function sendText(ctx, job) { return { ok:true, dryRun:true, jobId: job && job.id, to: job && job.to, note:'adapter placeholder; wire to Baileys locally' }; }
module.exports = { sendText };
