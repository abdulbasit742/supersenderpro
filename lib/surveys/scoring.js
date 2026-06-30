// lib/surveys/scoring.js — Score a set of responses for a survey. NPS = %promoters(9-10) -
// %detractors(0-6), in [-100,100]. CSAT = % of responses that are 'satisfied' (4-5 on a 1-5
// scale). Poll = counts per option. Text = just a count (qualitative). Pure functions.

function nps(values) {
 const n = values.length;
 if (!n) return { responses: 0, score: 0, promoters: 0, passives: 0, detractors: 0 };
 let pro = 0, pas = 0, det = 0;
 for (const v of values) { if (v >= 9) pro++; else if (v >= 7) pas++; else det++; }
 const score = Math.round(((pro / n) - (det / n)) * 100);
 return { responses: n, score, promoters: pro, passives: pas, detractors: det, promoterPct: Math.round((pro / n) * 100), detractorPct: Math.round((det / n) * 100) };
}
function csat(values) {
 const n = values.length;
 if (!n) return { responses: 0, csatPct: 0, average: 0 };
 const satisfied = values.filter((v) => v >= 4).length;
 const avg = values.reduce((s, v) => s + v, 0) / n;
 return { responses: n, csatPct: Math.round((satisfied / n) * 100), average: Math.round(avg * 100) / 100 };
}
function poll(values) {
 const counts = {};
 for (const v of values) counts[v] = (counts[v] || 0) + 1;
 const total = values.length;
 return { responses: total, options: Object.entries(counts).map(([option, count]) => ({ option, count, pct: total ? Math.round((count / total) * 100) : 0 })).sort((a, b) => b.count - a.count) };
}

module.exports = { nps, csat, poll };
