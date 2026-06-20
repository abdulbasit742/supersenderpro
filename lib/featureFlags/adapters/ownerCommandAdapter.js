// lib/featureFlags/adapters/ownerCommandAdapter.js — Owner Command integration (preview-only).
'use strict';
let available=false; try{ require.resolve('../../../lib/ownerBriefing'); available=true; }catch(_e){ available=false; }
function warningPreview(evt={}){
  return { available, channel:'owner_briefing', featureKey:evt.featureKey, reason:evt.reason, sent:false,
    message:`[PREVIEW] Owner alert: feature '${evt.featureKey}' kill switch considered (${evt.reason}).`,
    note: available?'Owner warning preview (not sent live)':'Owner Command not detected — preview only' };
}
module.exports={ warningPreview, available };
