#!/usr/bin/env node
'use strict';

/**
 * Reseller Portal readiness — runs every QA module + the doctor and writes
 * artifacts/reseller_portal_readiness.{json,md}. Read-only, secret-safe.
 * Exit 0 unless RESELLER_PORTAL_QA_STRICT=true and blockers exist.
 */

const fs = require('fs');
const path = require('path');

function load(rel) { try { return require(path.join(process.cwd(), rel)); } catch (e) { return null; } }


const onboardingDoctor = load('lib/resellerPortal/qa/onboardingDoctor');
const brandingQA = load('lib/resellerPortal/qa/brandingQA');
const referralQA = load('lib/resellerPortal/qa/referralQA');
const commissionQA = load('lib/resellerPortal/qa/commissionQA');
const tenantPrivacyQA = load('lib/resellerPortal/qa/tenantPrivacyQA');
const publicPartnerPageQA = load('lib/resellerPortal/qa/publicPartnerPageQA');
const assetQA = load('lib/resellerPortal/qa/assetQA');
const doctor = load('lib/resellerPortal/qa/resellerReadinessDoctor');

function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

const report = {
  generatedAt: new Date().toISOString(),
     onboarding: onboardingDoctor ? safe(function () { return onboardingDoctor.run(); }, null) : null,
     branding: brandingQA ? safe(function () { return brandingQA.run('qa_sample'); }, null) : null,
     referrals: referralQA ? safe(function () { return referralQA.run('qa_sample'); }, null) : null,
     commissions: commissionQA ? safe(function () { return commissionQA.run('qa_sample'); }, null) : null,
     privacy: tenantPrivacyQA ? safe(function () { return tenantPrivacyQA.run('qa_sample'); }, null) : null,
     publicPage: publicPartnerPageQA ? safe(function () { return publicPartnerPageQA.run(); }, null) : null,
     assets: assetQA ? safe(function () { return assetQA.run(); }, null) : null,
     doctor: doctor ? safe(function () { return doctor.run(); }, null) : null,
};

const d = report.doctor || { score: 0, status: 'blocked', blockers: ['doctor unavailable'] };

try {
  const dir = path.join(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
     fs.writeFileSync(path.join(dir, 'reseller_portal_readiness.json'), JSON.stringify(report, null, 2));
     const md = ['# Reseller Portal — Readiness Report', '', 'Generated: ' + report.generatedAt, '', 'Score: ' + d.score +
'/100 · Status: ' + d.status, '', '## Blockers', (d.blockers || []).map(function (b) { return '- ' + b; }).join(' ') || '- none', '', '## Warnings', (d.warnings || []).map(function (w) { return '- ' + w; }).join(' ') || '- none', '', '## Readiness', '- internal demo: ' + !!d.readyForInternalDemo, '- partner preview: ' +
!!d.readyForPartnerPreview, '- pilot partner: ' + !!d.readyForPilotPartner, '- public launch: ' +
!!d.readyForPublicPartnerLaunch].join(' ');
 fs.writeFileSync(path.join(dir, 'reseller_portal_readiness.md'), md);
} catch (e) { /* ignore */ }


console.log('Reseller Portal readiness: ' + d.score + '/100, status ' + d.status + ', blockers ' + ((d.blockers ||
[]).length));
const strict = String(process.env.RESELLER_PORTAL_QA_STRICT || 'false').toLowerCase() === 'true';
if (strict && (d.blockers || []).length > 0) { console.error('STRICT: blockers present. Exiting 1.'); process.exit(1); }
process.exit(0);
