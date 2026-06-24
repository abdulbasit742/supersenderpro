'use strict';

/**
 * spintax.js
 * Spintax expansion + variable templating for message personalization.
 *
 *  - Spintax:    "Hi {there|buddy|friend}"  -> one variant chosen at random
 *                supports nesting: "{Good {morning|day}|Hello}"
 *  - Variables:  "Hi {{name}}"  -> replaced from a vars object
 *
 * Variables use double braces {{ }} so they never clash with spintax {a|b}.
 */

/** Expand the innermost {a|b|c} groups repeatedly until none remain. */
function expandSpintax(text, rng = Math.random) {
  let out = String(text == null ? '' : text);
  let guard = 0;
  const group = /\{([^{}]*)\}/; // innermost group with no nested braces
  while (group.test(out)) {
    out = out.replace(group, (_, body) => {
      const options = body.split('|');
      return options[Math.floor(rng() * options.length)];
    });
    if (++guard > 1000) break; // safety against pathological input
  }
  return out;
}

/** Replace {{key}} (and {{ key }}) tokens from a vars object. */
function applyVariables(text, vars = {}) {
  return String(text == null ? '' : text).replace(
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    (_, key) => (vars[key] != null ? String(vars[key]) : '')
  );
}

/** Full render: variables first (so spintax in values still works), then spintax. */
function render(text, vars = {}, rng = Math.random) {
  return expandSpintax(applyVariables(text, vars), rng);
}

/** List the {{variable}} names referenced in a template body (unique, ordered). */
function extractVariables(text) {
  const found = [];
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found;
}

/** Count how many distinct messages a spintax string can produce. */
function countVariants(text) {
  let total = 1;
  let s = String(text || '');
  const group = /\{([^{}]*)\}/;
  // Rough product of option counts across all (flattened) groups.
  const stack = [];
  let guard = 0;
  while (group.test(s)) {
    s = s.replace(group, (_, body) => {
      stack.push(body.split('|').length);
      return '\u0000'; // placeholder
    });
    if (++guard > 1000) break;
  }
  for (const n of stack) total *= n;
  return total;
}

module.exports = { expandSpintax, applyVariables, render, extractVariables, countVariants };
