  'use strict';

  /** Loyalty Center — reward reminder message DRAFT (never sends). */


  const tiers = require('./rewardTierService');

  function build(customerId, kind, channel) {
    const c = tiers.getRaw(customerId);
       if (!c) return { ok: false, error: 'customer not found' };
       const ch = ['whatsapp_preview', 'email_preview'].includes(channel) ? channel : 'whatsapp_preview';
       const customerMasked = c.phoneMasked || c.emailMasked || c.customerNameSafe;
       let message;
       switch (kind) {
         case 'points_balance': message = `Hi ${c.customerNameSafe}! You have ${c.pointsBalancePreview} reward points


                                                                           🎉
  (${c.tier.replace('_preview','')}). Redeem on your next order. (preview)`; break;
      case 'birthday': message = `Happy birthday ${c.customerNameSafe}!    Here's a birthday reward on us. Reply to claim.
  (preview)`; break;
      case 'winback': message = `We miss you ${c.customerNameSafe}! Here's bonus points + store credit to come back.
  (preview)`; break;
      case 'vip': message = `${c.customerNameSafe}, you're a VIP! Enjoy early access + extra rewards this month.
  (preview)`; break;
      case 'referral': message = `${c.customerNameSafe}, share your referral code and earn points when friends buy.
  (preview)`; break;
      default: message = `${c.customerNameSafe}, an update on your rewards. (preview)`;
       }
       return { ok: true, dryRun: true, liveSend: false, channel: ch, customerMasked, messagePreview: message, warnings: [],
  blockers: ['live_send_disabled'] };
  }


  module.exports = { build };
