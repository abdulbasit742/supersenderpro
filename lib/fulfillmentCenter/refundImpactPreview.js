'use strict';
const returnsService = () => { try { return require('./returnsService'); } catch (_) { return null; } };
function preview(returnId) { const svc = returnsService(); const r = svc && svc.getRaw ? svc.getRaw(returnId) : null; if (!r) return { ok:false, error:'return not found' }; const amount = Math.max(0, Number(r.refundAmountPreview) || 0); const warnings = []; if (r.reason === 'damaged_item' || r.reason === 'defective_item') warnings.push('item may not be resellable'); return { ok:true, dryRun:true, liveRefund:false, liveLedgerWrite:false, returnId:r.id, refundAmountPreview:amount, lossImpactPreview:amount, warnings, blockers:['live_refund_disabled'] }; }
module.exports = { preview };
