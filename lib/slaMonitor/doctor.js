'use strict';
// Self-check for the SLA Monitor subsystem. Returns {ok, checks[]}.
// Pure/offline; safe to run in CI without a model or network.

const { config } = require('./config');
const sla = require('./index');

function check() {
  const checks = [];
  const push = (name, ok, detail) => checks.push({ name, ok, detail: detail || '' });

  push('config.firstResponseTargetMin > 0', config.firstResponseTargetMin > 0, String(config.firstResponseTargetMin));
  push('config.resolutionTargetMin > 0', config.resolutionTargetMin > 0, String(config.resolutionTargetMin));
  push('warnFraction in (0,1]', config.warnFraction > 0 && config.warnFraction <= 1, String(config.warnFraction));

  // Deterministic math sanity.
  const conv = {
    id: 'c1', tenantId: 't1', customer: '923001234567',
    events: [
      { t: '2026-06-30T10:00:00', dir: 'in', kind: 'open' },
      { t: '2026-06-30T10:05:00', dir: 'out' }
    ],
    resolvedAt: '2026-06-30T10:30:00'
  };
  const s = sla.scoreConversation(conv);
  push('first response computed', s.firstResponseMin === 5, 'got ' + s.firstResponseMin);
  push('phone masked', /\*\*\*/.test(s.customer), s.customer);
  push('breach classify ok', s.firstResponseState === 'ok', s.firstResponseState);

  const ok = checks.every(c => c.ok);
  return { ok, checks };
}

module.exports = { check };
