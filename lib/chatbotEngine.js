'use strict';

/**
 * chatbotEngine.js  (WATI-style auto-reply evaluation)
 * Given an incoming message, decides the bot's reply by:
 *   1. master enabled check
 *   2. office-hours check (optional outside-hours message)
 *   3. first matching keyword rule (by priority asc), rendered via
 *      text / template / quick-reply, with spintax + {{vars}} support
 *   4. configured default reply (optional)
 *
 * Pure + deterministic (accepts an injected `now` + rng) so it is unit-testable
 * without a live WhatsApp connection.
 */

const store = require('./chatbotStore');

let templates = null;
let quickReplies = null;
let spintax = null;
try { templates = require('./templateStore'); } catch (_) {}
try { quickReplies = require('./quickReplyStore'); } catch (_) {}
try { spintax = require('./spintax'); } catch (_) {}

function render(text, vars, rng) {
  if (spintax) return spintax.render(text || '', vars || {}, rng || Math.random);
  return String(text || '');
}

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Is `now` inside the configured office hours? */
function isWithinOfficeHours(officeHours, now = new Date()) {
  if (!officeHours || !officeHours.enabled) return true; // hours not enforced
  const day = now.getDay(); // 0=Sun..6=Sat
  if (Array.isArray(officeHours.days) && !officeHours.days.includes(day)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(officeHours.start);
  const end = toMinutes(officeHours.end);
  if (start == null || end == null) return true;
  return cur >= start && cur <= end;
}

/** Does an incoming message match a rule's keyword config? */
function ruleMatches(rule, text) {
  if (!rule || rule.enabled === false) return false;
  const cfg = rule.match || {};
  const kws = (cfg.keywords || []).filter(Boolean);
  if (!kws.length) return false;
  const cmp = cfg.caseSensitive ? (s) => s : (s) => s.toLowerCase();
  const msg = cmp(String(text || ''));
  return kws.some((kw) => {
    const k = cmp(String(kw));
    switch (cfg.type) {
      case 'equals': return msg.trim() === k.trim();
      case 'starts': return msg.trim().startsWith(k);
      case 'regex': try { return new RegExp(kw, cfg.caseSensitive ? '' : 'i').test(String(text || '')); } catch { return false; }
      case 'contains':
      default: return msg.includes(k);
    }
  });
}

/** Resolve a rule's response object into a rendered string. */
function resolveResponse(response, vars, rng) {
  if (!response) return '';
  if (response.type === 'template' && response.templateId && templates) {
    const t = templates.getTemplate(response.templateId);
    if (t) return render(t.body, vars, rng);
  }
  if (response.type === 'quickReply' && response.quickReplyId && quickReplies) {
    const q = quickReplies.getReply(response.quickReplyId);
    if (q) return render(q.body, vars, rng);
  }
  return render(response.text, vars, rng);
}

/**
 * Evaluate an incoming message.
 * @returns {{matched:boolean, source:string, ruleId:?string, reply:?string}}
 */
function evaluate(text, opts = {}) {
  const now = opts.now || new Date();
  const vars = opts.vars || {};
  const rng = opts.rng || Math.random;
  const settings = store.getSettings();

  if (!settings.enabled) return { matched: false, source: 'disabled', ruleId: null, reply: null };

  if (!isWithinOfficeHours(settings.officeHours, now)) {
    return {
      matched: !!settings.officeHours.outsideMessage,
      source: 'office-hours',
      ruleId: null,
      reply: settings.officeHours.outsideMessage || null,
    };
  }

  const rules = store.listRules().slice().sort((a, b) => (a.priority || 0) - (b.priority || 0));
  for (const rule of rules) {
    if (ruleMatches(rule, text)) {
      return { matched: true, source: 'rule', ruleId: rule.id, reply: resolveResponse(rule.response, vars, rng) };
    }
  }

  if (settings.defaultReply) {
    return { matched: true, source: 'default', ruleId: null, reply: render(settings.defaultReply, vars, rng) };
  }
  return { matched: false, source: 'no-match', ruleId: null, reply: null };
}

module.exports = { evaluate, isWithinOfficeHours, ruleMatches, resolveResponse };
