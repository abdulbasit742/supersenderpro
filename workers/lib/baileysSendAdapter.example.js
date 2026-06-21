  'use strict';

  /**
      * Baileys send adapter (worker side, EXAMPLE).
      *
      * This is where your EXISTING Baileys send logic plugs in. By default it does
      * NOT send: the dry-run guard short-circuits every send. Only when you both
      *     1) set LOCAL_WORKER_DRY_RUN=false, and
      *     2) call bindBaileys(sock) with your real socket,
      * will it attempt a real send.
      *
      * It never stores tokens, never touches session files, never moves anything.
      */

  const DRY_RUN = String(process.env.LOCAL_WORKER_DRY_RUN || 'true').toLowerCase() !== 'false';

  // Your real Baileys socket gets bound here at worker startup (optional).
  let _sock = null;


  /**
   * Bind your existing Baileys socket. Example in your real worker:
      *     const sock = require('../../path/to/your/existing/baileys/session');
      *     bindBaileys(sock);
   */
  function bindBaileys(sock) {
          _sock = sock;
  }

  /** Map a masked/queued job to a WhatsApp JID. Worker resolves the real number. */
  function toJid(to) {
    const digits = String(to || '').replace(/[^0-9]/g, '');
          return digits ? `${digits}@s.whatsapp.net` : null;
  }

  /**
      * Handle a claimed job. Returns a result object describing what happened.
      * NEVER sends in dry-run. NEVER sends without a bound socket.
   */
  async function handleJob(job) {
          if (DRY_RUN) {
            return { dryRun: true, sent: false, reason: 'LOCAL_WORKER_DRY_RUN', type: job.type };
          }
          if (!_sock) {


       return { dryRun: false, sent: false, reason: 'no baileys socket bound', type: job.type };
   }

   // --- REAL SEND PATH (only reached when you deliberately enable it) ---
   const payload = job.payload || {};
   const jid = toJid(job.to);
   if (!jid && job.type !== 'admin_alert') {
       return { dryRun: false, sent: false, reason: 'no recipient', type: job.type };
   }

   switch (job.type) {
       case 'whatsapp_send_text':
         await _sock.sendMessage(jid, { text: payload.text || '' });
        return { dryRun: false, sent: true, type: job.type };


       case 'whatsapp_send_template':
         // Map your template -> text/components here using your existing helper.
        await _sock.sendMessage(jid, { text: payload.renderedText || payload.text || '' });
        return { dryRun: false, sent: true, type: job.type };


       case 'whatsapp_send_media':
        // payload.url / payload.path resolved by your existing media helper.
        await _sock.sendMessage(jid, {
           caption: payload.caption || '',
           // image/document/video resolved by your existing logic:
          // image: { url: payload.url }
        });
        return { dryRun: false, sent: true, type: job.type };


       case 'whatsapp_channel_post':
         // Reuse your existing channel publisher here.
        return { dryRun: false, sent: true, type: job.type, note: 'route via existing channel publisher' };


       case 'admin_alert':
         // Send to your configured admin number via your existing path.
        return { dryRun: false, sent: true, type: job.type };


       case 'dry_run_test':
       default:
        return { dryRun: false, sent: false, type: job.type, note: 'no-op' };
   }
}


module.exports = { bindBaileys, handleJob };
