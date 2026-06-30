#!/usr/bin/env node
// scripts/returns-check.js
// Runs the returns department self-diagnostic and prints a summary.

'use strict';

const returns = require('../lib/returns');

function main() {
  const report = returns.doctor();
  for (const r of report.results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${r.name} - ${r.detail}`);
  }
  console.log(report.ok ? '\nreturns: ALL CHECKS PASSED' : '\nreturns: CHECKS FAILED');
  process.exit(report.ok ? 0 : 1);
}

main();
