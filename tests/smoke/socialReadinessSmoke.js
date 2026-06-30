// tests/smoke/socialReadinessSmoke.js
// Smoke test for lib/socialReadiness.js
// Asserts: report shape is valid, no raw secrets are exposed.
// Run: node tests/smoke/socialReadinessSmoke.js  OR  npm run social:smoke

"use strict";

const path = require("path");

const assert = (cond, msg) => {
  if (!cond) {
    console.error("SMOKE FAIL:", msg);
    process.exitCode = 1;
    throw new Error("SMOKE FAIL: " + msg);
  }
};

const warn = (msg) => console.warn("[WARN]", msg);

// ?? Load the lib ?????????????????????????????????????????????????????????????
let buildSocialReadinessReport;
try {
  ({ buildSocialReadinessReport } = require("../../lib/socialReadiness"));
} catch (e) {
  console.error("Cannot load lib/socialReadiness:", e.message);
  process.exitCode = 1;
  process.exit(1);
}

// ?? Run against repo root ?????????????????????????????????????????????????????
const ROOT   = path.join(__dirname, "../..");
let report;
try {
  report = buildSocialReadinessReport({ rootDir: ROOT });
} catch (e) {
  console.error("buildSocialReadinessReport threw:", e.message);
  process.exitCode = 1;
  process.exit(1);
}

// ?? Shape assertions ?????????????????????????????????????????????????????????
assert(report !== null && typeof report === "object", "report must be an object");
assert(typeof report.readiness === "string",  "report.readiness must be a string");
assert(typeof report.score    === "number",   "report.score must be a number");
assert(report.score >= 0 && report.score <= 100, "report.score must be 0-100");
assert(typeof report.totals   === "object",   "report.totals must be an object");
assert(typeof report.totals.checks  === "number", "totals.checks must be a number");
assert(typeof report.totals.passed  === "number", "totals.passed must be a number");
assert(typeof report.totals.failed  === "number", "totals.failed must be a number");
assert(Array.isArray(report.checks), "report.checks must be an array");
assert(report.checks.length > 0,    "report.checks must not be empty");
assert(Array.isArray(report.nextSteps), "report.nextSteps must be an array");
assert(typeof report.generatedAt === "string", "report.generatedAt must be a string");
assert(typeof report.summary === "object",     "report.summary must be an object");

// ?? Check that readiness value is valid ???????????????????????????????????????
const VALID_READINESS = ["production-ready", "staging-ready", "needs-work"];
assert(
  VALID_READINESS.includes(report.readiness),
  "readiness must be one of: " + VALID_READINESS.join(", ") + " - got: " + report.readiness
);

// ?? No raw secrets in JSON output ????????????????????????????????????????????
// Tokens/secrets are masked as e.g. "EAAx...xxxxx" - never full string
const jsonStr = JSON.stringify(report);

// Any value that looks like a full token (>= 40 chars of base64-ish chars) is suspicious
const tokenPattern = /[A-Za-z0-9+/=_\-]{40,}/g;
const longStrings = [];
const allMatches = jsonStr.match(tokenPattern) || [];
for (const match of allMatches) {
  // Allowed: ISO timestamps, generatedAt, recommendation strings, etc.
  // Filter: flag anything that matches known token patterns
  if (
    match.length >= 40 &&
    !match.includes("SuperSender") &&
    !match.includes("recommendation") &&
    !/^\d{4}-\d{2}-\d{2}/.test(match)
  ) {
    longStrings.push(match.slice(0, 20) + "...");
  }
}

if (longStrings.length > 0) {
  warn("Possible long token-like strings found in output (check masking): " + longStrings.slice(0, 3).join(", "));
  // This is a WARN not a fail - masked tokens still show partial characters
}

// Hard check: no raw env token key patterns appear in values
const sensitivePatterns = [
  /EAA[A-Za-z0-9]{20,}/,  // Facebook access token pattern
  /ya29\.[A-Za-z0-9._-]{10,}/,  // Google OAuth token
];
for (const pattern of sensitivePatterns) {
  assert(!pattern.test(jsonStr), "Detected unmasked sensitive token in report output!");
}

// ?? Check each check item structure ?????????????????????????????????????????
for (let i = 0; i < Math.min(report.checks.length, 5); i++) {
  const check = report.checks[i];
  assert(typeof check.name   === "string",  `checks[${i}].name must be a string`);
  assert(typeof check.passed === "boolean", `checks[${i}].passed must be a boolean`);
  assert(typeof check.level  === "string",  `checks[${i}].level must be a string`);
}

// ?? All done ?????????????????????????????????????????????????????????????????
if (process.exitCode) {
  console.error("\nSocial Readiness smoke test FAILED");
} else {
  console.log("\nSocial Readiness Smoke Test PASSED");
  console.log("  readiness : " + report.readiness);
  console.log("  score     : " + report.score + "%");
  console.log("  checks    : " + report.checks.length);
  console.log("  passed    : " + report.totals.passed);
  console.log("  failed    : " + report.totals.failed);
}
