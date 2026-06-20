// lib/whatsappCloudTemplates/templateQuality.js — Quality / risk assessment + category risk notes for templates.
'use strict';

const CATEGORY_RISK = {
  marketing: { level: 'high', notes: 'Requires explicit opt-in; high block/spam sensitivity; stricter Meta review.' },
  utility: { level: 'low', notes: 'Transactional; generally fast approval if non-promotional.' },
  authentication: { level: 'medium', notes: 'OTP/2FA only; must avoid any promotional content or URLs.' },
};

function assess(template = {}) {
  const risks = [];
  const score = { value: 100 };
  const penalize = (n, reason) => { score.value -= n; risks.push(reason); };

  const body = String(template.body || '');
  if (body.length > 700) penalize(10, 'Body is long — concise templates approve faster.');
  if ((template.variables || []).length > 6) penalize(10, 'Many variables increase rejection risk.');
  if (/https?:\/\//i.test(body) && template.category === 'authentication') {
    penalize(40, 'URLs are not allowed in authentication templates.');
  }
  if (/(free|win|winner|guarantee|click here)/i.test(body)) {
    penalize(15, 'Spam-trigger phrasing detected.');
  }
  if (!template.footer) penalize(5, 'No footer — a brand footer improves trust.');

  const cat = CATEGORY_RISK[template.category] || { level: 'unknown', notes: 'Unknown category.' };
  const value = Math.max(0, score.value);
  const rating = value >= 80 ? 'GREEN' : value >= 55 ? 'YELLOW' : 'RED';

  return {
    ok: true,
    qualityScore: value,
    qualityRating: rating,
    categoryRisk: cat,
    risks,
    dryRun: true,
  };
}

module.exports = { assess, CATEGORY_RISK };
