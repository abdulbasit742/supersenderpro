'use strict';
const RULES = [
 { match:/cool|cooling|gas|refriger/i, skill:'ac', hints:['Check refrigerant level','Inspect compressor','Clean filters'] },
 { match:/trip|breaker|wire|electric/i, skill:'electrical', hints:['Inspect breaker','Check load','Test wiring'] },
 { match:/water|pressure|leak|pipe/i, skill:'plumbing', hints:['Check pressure','Inspect pipe joints','Test motor'] }
];
function preview(problem) { const text = String(problem || ''); const hit = RULES.find((r) => r.match.test(text)) || { skill:'general', hints:['Inspect asset','Confirm symptoms','Prepare estimate'] }; return { ok:true, dryRun:true, liveActionsEnabled:false, skillNeeded:hit.skill, diagnosisHintsPreview:hit.hints, warnings:[], blockers:[] }; }
module.exports = { preview, RULES };
