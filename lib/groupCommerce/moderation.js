// lib/groupCommerce/moderation.js
// Group Commerce OS - group message moderation. Detects links/spam/scam/etc and
// returns a SUGGESTED action. Destructive actions are dry-run unless live flags on.


'use strict';

const analyzer = require('./messageAnalyzer');


const CONFIG = {
     dryRun: String(process.env.GROUP_COMMERCE_DRY_RUN || 'true') === 'true',
     linkDryRun: String(process.env.GROUP_COMMERCE_LINK_MODERATION_DRY_RUN || 'true') === 'true',
     liveGroupActions: String(process.env.GROUP_COMMERCE_LIVE_GROUP_ACTIONS || 'false') === 'true',
};

const BANNED_KEYWORDS = ['free money', 'double your', 'investment scheme', 'crypto giveaway', 'click to win', 'hot\nsingles'];
const LINK_RE = /\b((?:https?:\/\/|www\.)[^\s]+|[a-z0-9-]+\.(?:com|net|pk|io|co|link|xyz)\b[^\s]*)/i;


// recentByUser: optional array of this user's recent message texts (for repeat detection).
function moderate(message, opts) {
  const o = opts || {};
     const raw = String(message || '');
     const t = raw.toLowerCase();
     const findings = [];

     if (LINK_RE.test(raw)) findings.push('link');
     if (BANNED_KEYWORDS.some((k) => t.includes(k))) findings.push('banned_keyword');
  if (Array.isArray(o.recentByUser) && o.recentByUser.filter((m) => m === raw).length >= 2)
findings.push('repeated_message');


     const a = analyzer.analyze(raw);
     if (a.flags.includes('price_without_sku')) findings.push('price_without_sku');
     if (a.flags.includes('stock_without_product')) findings.push('stock_without_product');
     if (a.flags.includes('payment_first_claim')) findings.push('scam_like_payment');
     if (a.roleIntent === 'seller' && o.bannedLinks && findings.includes('link')) findings.push('unauthorized_seller_post');

     // Decide a suggested action (least-destructive first).
     let action = 'allow';
     if (findings.includes('banned_keyword') || findings.includes('scam_like_payment')) action = 'flag_for_admin';
     else if (findings.includes('link') && o.banLinks) action = CONFIG.linkDryRun ? 'dry_run_delete' : 'delete';
     else if (findings.includes('repeated_message')) action = 'warn';
     else if (findings.includes('unauthorized_seller_post')) action = 'warn';
     else if (a.roleIntent === 'seller' && a.sellerConfidence > 0.7 && o.trustedSellers &&
o.trustedSellers.includes(o.fromHash)) action = 'appreciate_trusted_seller';


     // Enforce dry-run for destructive actions unless explicitly live.
     const destructive = ['delete', 'remove_user'];
     if (destructive.includes(action) && !(CONFIG.liveGroupActions && !CONFIG.dryRun)) {
       action = action === 'delete' ? 'dry_run_delete' : 'dry_run_remove_user';
     }


     return {
       action,
         findings,


     analysis: a,
     dryRun: CONFIG.dryRun || CONFIG.linkDryRun || !CONFIG.liveGroupActions,
     wouldDo: describe(action),
   };
}


function describe(action) {
   const map = {
     allow: 'no action',
     warn: 'would send a warning to the member',
     flag_for_admin: 'would notify admin to review',
     dry_run_delete: 'WOULD delete the message (dry-run, not deleted)',
     delete: 'delete the message',
     dry_run_remove_user: 'WOULD remove the user (dry-run, not removed)',
     remove_user: 'remove the user',
     appreciate_trusted_seller: 'would thank/boost a trusted seller',
     pause_group_ai: 'would pause group AI replies',
   };
   return map[action] || action;
}

module.exports = { moderate, CONFIG, BANNED_KEYWORDS };
