'use strict';
/** Sales/pitch script drafts by type + language. Drafts only; consent-safe messaging noted. */
const S = {
  en: {
    pitch: 'SuperSender Pro helps your clients run WhatsApp sales, support, and campaigns safely from one dashboard. Want a quick demo?',
    whatsapp_intro: 'Hi! I help businesses automate WhatsApp sales + support with SuperSender Pro. Can I send you a short demo link? (reply STOP to opt out)',
    pricing: 'Plans scale from Starter to Agency. You only pay for what you use, and there is a free demo sandbox to try first.',
    objection: 'Worried about WhatsApp bans? Everything is consent-safe and dry-run by default, with built-in opt-out compliance.',
    upgrade: 'You are getting great results on your current plan. Upgrading unlocks more channels + automations. Want the comparison?',
  },
  roman_urdu: {
    pitch: 'SuperSender Pro aapke clients ko WhatsApp sales, support aur campaigns ek dashboard se safely chalane deta hai. Demo doon?',
    whatsapp_intro: 'Salam! Main businesses ko WhatsApp sales+support automate karne me madad karta hoon. Short demo link bhejoon? (STOP likhein opt-out ke liye)',
    pricing: 'Plans Starter se Agency tak hain. Sirf usage ka paisa, aur free demo sandbox try karne ke liye.',
    objection: 'WhatsApp ban ki fikar? Sab kuch consent-safe aur dry-run by default hai, opt-out compliance built-in.',
    upgrade: 'Current plan par results acha hai. Upgrade se ziada channels+automations milte hain. Comparison bhejoon?',
  },
};
function get(type, language) { const lang = language === 'roman_urdu' ? 'roman_urdu' : 'en'; return S[lang][type] || S[lang].pitch; }
module.exports = { get, S };
