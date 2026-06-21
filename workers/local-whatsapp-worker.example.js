  'use strict';

  /**
      * SuperSender Pro — Example LOCAL WhatsApp worker.
      *
      * Runs on your local PC / VPS (where Baileys + QR sessions live). Talks to the
      * CLOUD bridge API over HTTP. It:
      *     1. sends heartbeats,
      *     2. polls for pending jobs,
      *     3. claims a job,
      *     4. (DRY-RUN) marks it complete without sending,
      *     5. shows exactly where your existing Baileys send logic would plug in.
      *
      * It NEVER sends real WhatsApp messages by default and NEVER hardcodes a token.
      * Config comes from env only:
      *     LOCAL_WORKER_API_BASE    e.g. http://localhost:3001 (your cloud bridge base)
      *     LOCAL_WORKER_ID          the workerId returned by /register
      *     LOCAL_WORKER_TOKEN       the token returned ONCE by /register
      *     LOCAL_WORKER_DRY_RUN     'true' (default) keeps sending disabled
      */

  const http = require('http');
  const https = require('https');
  const { URL } = require('url');

  const API_BASE = process.env.LOCAL_WORKER_API_BASE || 'http://localhost:3001';
  const WORKER_ID = process.env.LOCAL_WORKER_ID || '';
  const TOKEN = process.env.LOCAL_WORKER_TOKEN || '';
  const DRY_RUN = String(process.env.LOCAL_WORKER_DRY_RUN || 'true').toLowerCase() !== 'false';
  const POLL_MS = parseInt(process.env.LOCAL_WORKER_POLL_MS || '5000', 10);
  const HEARTBEAT_MS = parseInt(process.env.LOCAL_WORKER_HEARTBEAT_MS || '30000', 10);

  if (!WORKER_ID || !TOKEN) {
          console.error('[worker] Missing LOCAL_WORKER_ID or LOCAL_WORKER_TOKEN env. Register first, then set env. Exiting.');
          process.exit(1);
  }

  /** Minimal JSON HTTP client over built-in http/https. */
  function request(method, path, body) {
          return new Promise((resolve, reject) => {
            let url;
           try {
             url = new URL(path, API_BASE);


        } catch (e) {
            return reject(e);
        }
        const lib = url.protocol === 'https:' ? https : http;
        const payload = body ? JSON.stringify(body) : null;
        const req = lib.request(
          url,
            {
                method,
                headers: {
                  'content-type': 'application/json',
                  'x-worker-token': TOKEN, // token sent via header, never logged
                },
            },
            (res) => {
                let data = '';
                res.on('data', (c) => (data += c));
                res.on('end', () => {
                  let parsed = null;
                  try {
                    parsed = data ? JSON.parse(data) : null;
                  } catch (_e) {
                    parsed = { raw: data };
                  }
                  resolve({ status: res.statusCode, body: parsed });
                });
            }
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}


async function sendHeartbeat() {
    try {
      const res = await request('POST', `/api/local-worker/workers/${WORKER_ID}/heartbeat`, {
            workerId: WORKER_ID,
            status: 'running',
            uptime: Math.round(process.uptime()),
            whatsappStatus: DRY_RUN ? 'dry-run' : 'connected',
            activeSessions: DRY_RUN ? 0 : 1,
            queueDepth: 0,
            memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
            warnings: DRY_RUN ? ['dry-run mode: not sending real messages'] : [],
        });
        if (res.status !== 200) console.warn('[worker] heartbeat http', res.status);
    } catch (e) {
      console.warn('[worker] heartbeat failed:', e.message);
    }
}


/**
   * Where your REAL Baileys send logic would go. Intentionally a no-op here.
   * In your own workers/local-whatsapp-worker.js you would import your existing
   * Baileys socket and call it, e.g.:
   *


   *       const sock = require('../path/to/your/baileys/session');
   *       await sock.sendMessage(jid, { text });
   *
   * This example NEVER does that.
   */
async function performJob(job) {
 if (DRY_RUN) {
           console.log(`[worker] DRY-RUN: would handle ${job.type} (${job.id}) -> no message sent`);
           return { dryRun: true, handled: job.type };
       }
       // Even with DRY_RUN=false, this example refuses to send. Wire your Baileys
       // logic here deliberately and remove this guard only when you mean it.
       console.log(`[worker] live mode requested for ${job.id}, but example worker does not send. Connect Baileys here.`);
       return { dryRun: false, handled: false, note: 'connect baileys send logic' };
}


async function pollOnce() {
       try {
         const list = await request('GET', '/api/local-worker/jobs?status=pending&limit=1');
           const jobs = (list.body && list.body.jobs) || [];
           if (!jobs.length) return;
           const job = jobs[0];

           const claim = await request('POST', `/api/local-worker/jobs/${job.id}/claim`, { workerId: WORKER_ID });
           if (claim.status !== 200) {
            console.log('[worker] could not claim', job.id, claim.status);
            return;
           }
           console.log('[worker] claimed', job.id, job.type);


           try {
            const result = await performJob(job);
            await request('POST', `/api/local-worker/jobs/${job.id}/complete`, {
               workerId: WORKER_ID,
               result,
            });
            console.log('[worker] completed (dry-run-safe)', job.id);
           } catch (e) {
             await request('POST', `/api/local-worker/jobs/${job.id}/fail`, {
               workerId: WORKER_ID,
               error: e.message,
            });
            console.log('[worker] failed', job.id, e.message);
         }
       } catch (e) {
           console.warn('[worker] poll failed:', e.message);
       }
}


async function main() {
 console.log('[worker] starting. API_BASE=%s DRY_RUN=%s', API_BASE, DRY_RUN);
       console.log('[worker] (token loaded from env, never printed)');
       await sendHeartbeat();
       setInterval(sendHeartbeat, HEARTBEAT_MS);
       setInterval(pollOnce, POLL_MS);
}


main().catch((e) => {
 console.error('[worker] fatal:', e.message);
 process.exit(1);
});
