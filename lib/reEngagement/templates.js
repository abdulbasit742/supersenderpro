// lib/reEngagement/templates.js
// Win-back message templates, keyed by the reason a customer is being re-engaged.
// Templates use the existing {{merge}} syntax (lib/mergeFields) and the {a|b|c}
// spintax the renderer already supports, so each send reads a little differently
// and avoids looking like a blast.
//
// Keep these short, warm, and Roman-Urdu-friendly — that's how PES talks to its
// WhatsApp customers. No pushy discounts unless the customer is high-value.

const TEMPLATES = {
  // High churn risk + previously a repeat/high-value buyer: worth a real offer.
  winback_highvalue: {
    label: 'High-value win-back (with offer)',
    body:
      '{Assalam o Alaikum|Hi|Hello} {{name}}! 👋 {Bohat din ho gaye|It\'s been a while} aap se baat kiye. ' +
      'Aap humare *valued customer* hain, is liye ek *special offer* sirf aap ke liye rakha hai. ' +
      'Wapas aaiye aur {{loyalty_perk}} ka faida uthaiye. Reply karein "YES" 🙌',
  },
  // Medium risk, quiet but not lost: a gentle nudge.
  winback_nudge: {
    label: 'Gentle re-engagement nudge',
    body:
      '{Hi|Hello} {{name}}! 😊 Hum aap ko miss kar rahe hain. {Naya stock aa gaya hai|We just restocked} ' +
      'aur kuch {new arrivals|nayi cheezein} aap ko zaroor pasand aayengi. Ek nazar daal lein? 🛍️',
  },
  // Never purchased but engaged once: convert.
  winback_firstorder: {
    label: 'First-order conversion',
    body:
      '{Hi|Hello} {{name}}! Aap ne humein contact kiya tha lekin order complete nahi hua. ' +
      'Koi sawaal hai to abhi poochein — hum madad ke liye yahin hmain. Pehle order par {{loyalty_perk}}! ✨',
  },
  // Lapsed subscriber (paid plan expired).
  winback_subscription: {
    label: 'Subscription win-back',
    body:
      '{Hi|Hello} {{name}}! Aap ka *{{business}}* plan expire ho gaya hai. ' +
      'Wapas activate karein aur apne tools dobara use karna shuru karein. Help chahiye to bas reply karein. 🔁',
  },
};

// Default loyalty sweetener text per risk band (only filled for high-value).
const LOYALTY_PERK = {
  high: 'extra loyalty points + a member discount',
  medium: 'bonus loyalty points',
  low: 'a little thank-you reward',
};

function pickTemplate({ band, frequency, monetary, kind }) {
  if (kind === 'subscription') return 'winback_subscription';
  if ((frequency || 0) === 0) return 'winback_firstorder';
  if (band === 'high' && (monetary || 0) > 0) return 'winback_highvalue';
  return 'winback_nudge';
}

module.exports = { TEMPLATES, LOYALTY_PERK, pickTemplate };
