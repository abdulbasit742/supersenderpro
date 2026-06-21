  'use strict';

  const { SEVERITY_WEIGHT } = require('./qualityRuleModel');


  function grade(score) {
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
  }


  function penalty(issues) {
      return (issues || []).reduce((sum, i) => sum + (SEVERITY_WEIGHT[i.severity] || 0), 0);
  }

  function scoreFor(issues) {
      const raw = 100 - penalty(issues);
      return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function compute(issues) {
    const all = Array.isArray(issues) ? issues : [];
      const entities = ['product', 'customer', 'supplier', 'finance', 'inventory'];
      const byEntity = {};
      entities.forEach((e) => {
        const subset = all.filter((i) => i.entity === e);
        const s = scoreFor(subset);
        byEntity[e] = { score: s, grade: grade(s), issueCount: subset.length };
      });
      const overall = scoreFor(all);
      return {
        overall,
        grade: grade(overall),
        issueCount: all.length,
        byEntity,
      };
  }

  module.exports = { grade, penalty, scoreFor, compute };
