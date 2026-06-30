// lib/reEngagement/templates.js — win-back message templates keyed by reason.
const TEMPLATES = {
  winback_highvalue: { label: 'High-value win-back (with offer)', body: '{Assalam o Alaikum|Hi|Hello} {{name}}! \uD83D\uDC4B Bohat din ho gaye. Aap humare *valued customer* hain, ek *special offer* sirf aap ke liye. Wapas aaiye aur {{loyalty_perk}} ka faida uthaiye. Reply "YES" \uD83D\uDE4C' },
  winback_nudge: { label: 'Gentle re-engagement nudge', body: '{Hi|Hello} {{name}}! \uD83D\uDE0A Hum aap ko miss kar rahe hain. Naya stock aa gaya hai, ek nazar daal lein? \uD83D\uDED2' },
  winback_firstorder: { label: 'First-order conversion', body: '{Hi|Hello} {{name}}! Aap ne contact kiya tha lekin order complete nahi hua. Koi sawaal ho to poochein. Pehle order par {{loyalty_perk}}! \u2728' },
  winback_subscription: { label: 'Subscription win-back', body: '{Hi|Hello} {{name}}! Aap ka *{{business}}* plan expire ho gaya hai. Wapas activate karein. \uD83D\uDD01' },
};
const LOYALTY_PERK = { high: 'extra loyalty points + a member discount', medium: 'bonus loyalty points', low: 'a little thank-you reward' };
function pickTemplate({ band, frequency, monetary, kind }) {
  if (kind === 'subscription') return 'winback_subscription';
  if ((frequency || 0) === 0) return 'winback_firstorder';
  if (band === 'high' && (monetary || 0) > 0) return 'winback_highvalue';
  return 'winback_nudge';
}
module.exports = { TEMPLATES, LOYALTY_PERK, pickTemplate };
