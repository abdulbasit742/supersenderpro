// lib/whatsappCloudTemplates/templateSyncPreview.js — Previews a template sync against Meta WITHOUT any live API call.
// A live call is only ever attempted if WHATSAPP_CLOUD_TEMPLATE_SYNC_LIVE=true (off by default) — and even then this
// module returns a dry-run preview describing what WOULD be synced; it does not implement live network calls here.
'use strict';

const store = require('./templateStore');

function syncLiveEnabled() {
  return String(process.env.WHATSAPP_CLOUD_TEMPLATE_SYNC_LIVE || 'false').toLowerCase() === 'true';
}

// Build a preview of local templates and the action that would be taken for each on sync.
function syncPreview() {
  const local = store.all();
  const plan = local.map((t) => {
    let action;
    switch (t.status) {
      case 'approved': action = 'in_sync (already approved upstream)'; break;
      case 'pending': action = 'awaiting_meta_review'; break;
      case 'rejected': action = 'fix_and_resubmit'; break;
      case 'draft': action = 'would_submit_for_approval'; break;
      default: action = 'review_status';
    }
    return { id: t.id, name: t.name, category: t.category, status: t.status, action };
  });

  return {
    ok: true,
    dryRun: true,
    liveSyncEnabled: syncLiveEnabled(),
    liveSyncPerformed: false,
    note: syncLiveEnabled()
      ? 'Live sync flag is ON, but this preview still performs NO network call. Implement live sync explicitly + with approval.'
      : 'Live sync disabled (WHATSAPP_CLOUD_TEMPLATE_SYNC_LIVE=false). Showing local plan only.',
    localCount: local.length,
    plan,
  };
}

module.exports = { syncPreview, syncLiveEnabled };
