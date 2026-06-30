// lib/templateLibrary/variables.js — Parse {{variables}} out of a template body and render with
// strict validation. Variable syntax: {{name}} or {{name|Default text}}. parse() returns the
// distinct variable names (+ any defaults). render() substitutes provided values, falls back to
// declared defaults, and reports any still-missing required variables (no silent blanks unless a
// default exists).

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|([^}]*))?\}\}/g;

function parse(body) {
 const out = new Map();
 const s = String(body == null ? '' : body);
 let m;
 VAR_RE.lastIndex = 0;
 while ((m = VAR_RE.exec(s)) !== null) {
 const name = m[1];
 const def = m[2] !== undefined ? m[2] : null;
 if (!out.has(name)) out.set(name, { name, default: def, required: def === null });
 }
 return [...out.values()];
}

// render(body, values) -> { text, missing:[names], used:[names], truncatedFrom?:n }
function render(body, values = {}, { maxChars } = {}) {
 const s = String(body == null ? '' : body);
 const missing = [];
 const used = [];
 let text = s.replace(VAR_RE, (_m, name, def) => {
 const provided = values[name];
 if (provided !== undefined && provided !== null && String(provided) !== '') { used.push(name); return String(provided); }
 if (def !== undefined) { used.push(name); return def; } // declared default (may be empty)
 missing.push(name); return `{{${name}}}`; // leave token so the gap is visible, not silent
 });
 const result = { text, missing: [...new Set(missing)], used: [...new Set(used)] };
 if (maxChars && text.length > maxChars) { result.truncatedFrom = text.length; result.text = text.slice(0, maxChars); }
 return result;
}

module.exports = { parse, render, VAR_RE };
