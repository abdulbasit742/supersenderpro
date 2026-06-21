  'use strict';


  /** Business Alerts — severity ranking + sort. */


  const RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };


  function sort(alerts) {
      return (alerts || []).slice().sort((a, b) => (RANK[b.severity] || 0) - (RANK[a.severity] || 0));
  }
  function counts(alerts) {
    const c = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
      for (const a of (alerts || [])) if (c[a.severity] !== undefined) c[a.severity] += 1;
      return c;
  }


  module.exports = { RANK, sort, counts };
