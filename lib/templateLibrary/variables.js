// lib/templateLibrary/variables.js — Parse, validate, and render template variables.
// Syntax: {{name}} or {{name|fallback text}}. Fallback is used when the context value is missing.
// Unknown tokens (not provided + no fallback) render empty and are reported by validate().

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|([^}]*))?\}\}/g;

// Extract the distinct variable names used in a template body.
function extract(body) {
 const out = [];
 const seen = new Set();
 let m;
 const re = new RegExp(TOKEN.source, 'g');
 while ((m = re.exec(String(body || ''))) !== null) {
 const name = m[1];
 if (!seen.has(name)) { seen.add(name); out.push({ name, hasFallback: m[2] !== undefined }); }
 }
 return out;
}

function _get(ctx, dotted) {
 return String(dotted).split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

// Render: replace each token with the context value, else its fallback, else ''.
function render(body, ctx = {}) {
 const re = new RegExp(TOKEN.source, 'g');
 return String(body == null ? '' : body).replace(re, (_m, name, fallback) => {
 const val = _get(ctx, name);
 if (val !== undefined && val !== null && val !== '') return String(val);
 return fallback !== undefined ? fallback : '';
 });
}

// Validate a template body against a set of known/declared variables + a sample/context.
// Returns { variables, missingInContext, unknownDeclared, ok }.
function validate(body, { declared = [], context = null } = {}) {
 const used = extract(body);
 const declaredSet = new Set(declared.map(String));
 // Variables used but not declared (informational; declaration is optional).
 const undeclared = used.filter((u) => declared.length && !declaredSet.has(u.name)).map((u) => u.name);
 // If a context is supplied, which used vars (without fallback) are missing from it?
 let missingInContext = [];
 if (context) {
 missingInContext = used.filter((u) => !u.hasFallback && (_get(context, u.name) === undefined || _get(context, u.name) === null || _get(context, u.name) === '')).map((u) => u.name);
 }
 return { variables: used.map((u) => u.name), undeclaredUsed: undeclared, missingInContext, ok: missingInContext.length === 0 };
}

module.exports = { extract, render, validate, TOKEN };
