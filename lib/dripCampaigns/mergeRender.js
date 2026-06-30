// lib/dripCampaigns/mergeRender.js — Render {{merge}} fields in a step message from enrollment
// context. Unknown fields render empty (never leaks the literal token).

function render(template = '', ctx = {}) {
 const map = Object.assign({ name: 'there' }, ctx || {});
 return String(template).replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (map[k] !== undefined && map[k] !== null ? String(map[k]) : ''));
}

module.exports = { render };
