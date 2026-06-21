  'use strict';

  /** Business Alerts — daily/weekly digest preview (owner briefing). */


  const store = require('./store');
  const priority = require('./alertPriority');
  const { redactDeep } = require('./redactor');

  function digest(period) {
      const all = store.readAlerts();
      const open = all.filter((a) => !['resolved_preview', 'dismissed_preview'].includes(a.status));
      const counts = priority.counts(open);
      const byCategory = {};
      for (const a of open) byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      const top = priority.sort(open).slice(0, 8).map((a) => ({ title: a.title, severity: a.severity, category: a.category,
  summary: a.summary }));


      const headline = counts.critical > 0
        ? `${counts.critical} critical issue(s) need attention`
        : counts.high > 0 ? `${counts.high} high-priority alert(s) open` : 'No critical alerts; business looks stable';


      return {
        ok: true, dryRun: true,
        period: ['daily', 'weekly'].includes(period) ? period : 'daily',
        headline,
        counts,
        byCategory,
        topAlerts: redactDeep(top),
        generatedAt: new Date().toISOString(),
        warnings: [], blockers: [],
      };
  }

  module.exports = { digest };
