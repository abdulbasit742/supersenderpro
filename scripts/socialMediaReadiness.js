/*
 * SuperSender Pro - Social Media Production Readiness Check (CLI)
 *
 * Usage:
 *   node scripts/socialMediaReadiness.js
 *   node scripts/socialMediaReadiness.js --json
 *   node scripts/socialMediaReadiness.js --markdown
 *   node scripts/socialMediaReadiness.js --fail-on-critical
 *
 * Report logic lives in lib/socialReadiness.js (reused by /api/social/readiness endpoint).
 */

"use strict";

const path = require("path");
const { buildSocialReadinessReport } = require("../lib/socialReadiness");

const args         = new Set(process.argv.slice(2));
const outputJson   = args.has("--json");
const outputMd     = args.has("--markdown");
const failOnCrit   = args.has("--fail-on-critical");

const ROOT   = path.join(__dirname, "..");
const report = buildSocialReadinessReport({ rootDir: ROOT });

function printText(r) {
  console.log("\nSuperSender Pro \u2014 Social Media Production Readiness");
  console.log("=".repeat(60));
  console.log("Status: " + r.readiness);
  console.log("Score:  " + r.score + "%");
  console.log("Passed: " + r.totals.passed + "/" + r.totals.checks);
  console.log("Critical failed: " + r.totals.criticalFailed);
  console.log("Warning failed:  " + r.totals.warningFailed);
  console.log("\nSummary:");
  console.log("- Social accounts: " + r.summary.configuredAccounts + "/" + r.summary.socialAccounts + " configured");
  console.log("- Public media URL: " + (r.summary.publicBaseUrl || "missing"));
  console.log("- Video providers: "  + r.summary.videoProviders);
  console.log("\nFailed checks:");
  const failed = r.checks.filter((c) => !c.passed);
  if (!failed.length) {
    console.log("- None");
  } else {
    for (const c of failed) {
      console.log("- [" + c.level + "] " + c.name + ": " + c.details);
      if (c.recommendation) console.log("  Fix: " + c.recommendation);
    }
  }
  console.log("\nUseful commands:");
  console.log("- npm run health");
  console.log("- npm run social:check");
  console.log("- npm run social:check -- --json");
  console.log("- npm run social:smoke");
  console.log("");
}

function printMarkdown(r) {
  const lines = [
    "# SuperSender Pro \u2014 Social Media Production Readiness",
    "",
    "Generated: " + r.generatedAt,
    "",
    "**Status:** " + r.readiness,
    "**Score:**  " + r.score + "%",
    "**Passed:** " + r.totals.passed + "/" + r.totals.checks,
    "**Critical failed:** " + r.totals.criticalFailed,
    "**Warning failed:**  " + r.totals.warningFailed,
    "",
    "## Summary",
    "",
    "- Social accounts configured: " + r.summary.configuredAccounts + "/" + r.summary.socialAccounts,
    "- Public media URL: " + (r.summary.publicBaseUrl || "missing"),
    "- Video providers: "  + r.summary.videoProviders,
    "",
    "## Failed Checks",
    ""
  ];
  const failed = r.checks.filter((c) => !c.passed);
  if (!failed.length) {
    lines.push("- None");
  } else {
    for (const c of failed) {
      lines.push("- **[" + c.level + "] " + c.name + "** \u2014 " + c.details);
      if (c.recommendation) lines.push("  - Fix: " + c.recommendation);
    }
  }
  console.log(lines.join("\n"));
}

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (outputMd) {
  printMarkdown(report);
} else {
  printText(report);
}

if (failOnCrit && report.totals.criticalFailed > 0) {
  process.exitCode = 1;
}