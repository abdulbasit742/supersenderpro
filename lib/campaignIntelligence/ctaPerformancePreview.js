// lib/campaignIntelligence/ctaPerformancePreview.js — CTA clarity scoring preview.
 'use strict';
 const cfg = require('./config');
 const { safeText } = require('./redactor');


 function scoreCta(text) {
     const s = String(text || '').trim(); let score = 40; const notes = [];
     if (/^(reply|tap|click|order|buy|book|call|send)/i.test(s)) { score += 25; notes.push('starts with action verb'); }
     if (s.split(/\s+/).length <= 4) { score += 20; notes.push('concise'); } else { notes.push('consider shortening'); }
     if (!s) { score = 0; notes.push('empty CTA'); }
     return { scorePreview: Math.max(0, Math.min(100, score)), notesPreview: notes };
 }


 function ctaPerformance(input) {
     const i = input || {};
     const ctas = Array.isArray(i.ctas) ? i.ctas : [i.cta || ''];
     const resultsPreview = ctas.map((c) => Object.assign({ ctaPreview: safeText(c) }, scoreCta(c)));
     const best = resultsPreview.slice().sort((a, b) => b.scorePreview - a.scorePreview)[0] || null;
     return cfg.base({ resultsPreview, bestCtaPreview: best });
 }
 module.exports = { ctaPerformance, scoreCta };
