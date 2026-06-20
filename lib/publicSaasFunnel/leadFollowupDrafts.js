// lib/publicSaasFunnel/leadFollowupDrafts.js
// Generates follow-up DRAFTS only. Never sends. Respects consent.
// Languages: English, Roman Urdu, Urdu-friendly mixed.

const complianceAdapter = require('./complianceAdapter');
const { config } = require('./store');

const BRAND = 'SuperSender Pro';

function pickLang(lang) {
  const l = String(lang || config.defaultLanguage || 'roman_urdu').toLowerCase();
  if (l.startsWith('en')) return 'english';
  if (l.startsWith('urdu') || l === 'mixed') return 'mixed';
  return 'roman_urdu';
}

function templates(lang, ctx) {
  const name = ctx.nameSafe || 'there';
  const plan = ctx.interestedPlan || 'your plan';
  const biz = ctx.businessType || 'your business';
  const T = {
    english: {
      whatsapp: `Hi ${name}! Thanks for your interest in ${BRAND}. For ${biz}, we can help automate WhatsApp, follow-ups and growth. Want a quick demo?`,
      email: `Subject: Your ${BRAND} request\n\nHi ${name},\n\nThanks for reaching out about ${BRAND} for ${biz}. We'd love to show you how it works and discuss ${plan}.\n\nReply to book a demo.\n\n— ${BRAND} Team`,
      demo: `Hi ${name}, your demo request for ${BRAND} is received. We'll share a proposed time shortly.`,
      voice: `Hello ${name}, this is the ${BRAND} team following up on your interest. We'd love to schedule a short demo.`,
    },
    roman_urdu: {
      whatsapp: `Assalam o Alaikum ${name}! ${BRAND} mein interest ke liye shukriya. ${biz} ke liye hum WhatsApp, follow-up aur growth automate kar sakte hain. Demo dekhna chahenge?`,
      email: `Subject: Aap ki ${BRAND} request\n\n${name} sahib,\n\n${biz} ke liye ${BRAND} mein interest ka shukriya. Hum aapko dikhana chahenge ke ye kaise kaam karta hai aur ${plan} ke baare mein baat karein.\n\nDemo book karne ke liye reply karein.\n\n— ${BRAND} Team`,
      demo: `${name}, aap ki demo request mil gayi hai. Hum jald hi time propose karenge.`,
      voice: `Assalam o Alaikum ${name}, ${BRAND} team aap ke interest par follow-up kar rahi hai. Aaiye ek chhota demo schedule karte hain.`,
    },
    mixed: {
      whatsapp: `Hi ${name}! ${BRAND} mein interest ka shukriya 🙌 For ${biz}, hum WhatsApp + follow-ups automate kar dete hain. Demo dekhein?`,
      email: `Subject: ${BRAND} — aap ki request\n\nHi ${name},\n\nThanks! ${biz} ke liye ${BRAND} perfect hai. ${plan} discuss karne ke liye reply karein.\n\n— ${BRAND} Team`,
      demo: `Hi ${name}, demo request received ✅ Time shortly share karenge.`,
      voice: `Hello ${name}, ${BRAND} team here — ek short demo schedule karna chahenge.`,
    },
  };
  return T[lang] || T.roman_urdu;
}

// type: whatsapp | email | demo | trial | setup_checklist | plan_recommendation | reseller | voice
function generate(lead = {}, type = 'whatsapp', opts = {}) {
  const consent = complianceAdapter.checkConsent(lead);
  const lang = pickLang(opts.language);
  const t = templates(lang, lead);

  const marketingTypes = ['whatsapp', 'email', 'voice', 'reseller', 'plan_recommendation'];
  const isMarketing = marketingTypes.includes(type);

  // Consent gate: block marketing drafts when no consent; allow admin review note only.
  if (isMarketing && config.requireConsent && !consent.canMarket) {
    return {
      type,
      language: lang,
      blocked: true,
      send: false,
      reason: consent.reasons.join(',') || 'no_marketing_consent',
      adminReviewNote: `Lead ${lead.id || ''} has not opted in to marketing. Only admin review allowed — do NOT send marketing follow-up.`,
      createdAt: new Date().toISOString(),
    };
  }

  let body;
  switch (type) {
    case 'email': body = t.email; break;
    case 'demo': body = t.demo; break;
    case 'voice': body = t.voice; break;
    case 'trial': body = `${t.whatsapp}\n\n(Trial request review draft — confirm plan & preset before activation.)`; break;
    case 'setup_checklist': body = `${t.whatsapp}\n\nSetup checklist preview attached. Review before go-live.`; break;
    case 'plan_recommendation': body = `${t.whatsapp}\n\nRecommended plan: ${lead.interestedPlan || 'Growth'}.`; break;
    case 'reseller': body = `${t.whatsapp}\n\nReseller/agency inquiry — partnership details to follow.`; break;
    default: body = t.whatsapp;
  }

  return {
    type,
    language: lang,
    blocked: false,
    send: false, // ALWAYS false — drafts are never auto-sent
    draft: body,
    consent: { canContact: consent.canContact, canMarket: consent.canMarket },
    note: 'DRAFT only — review and send manually. SuperSender Pro never auto-sends from the funnel.',
    createdAt: new Date().toISOString(),
  };
}

module.exports = { generate, pickLang };
