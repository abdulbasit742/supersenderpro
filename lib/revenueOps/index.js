// lib/revenueOps/index.js
// Revenue Operations + Sales Pipeline Command Center — unified read-only, preview-only, dry-run API surface.
// Deterministic local heuristics only. No live sends, no Meta/AI/payment calls, no CRM/deal mutation, PII masked.
'use strict';

const red = require('./redactor');
const { getSampleOpportunities, getSampleLeads, STAGES } = require('./sampleDeals');
const { scoreDeal } = require('./dealScoring');
const { pipelineHealth } = require('./pipelineEngine');
const { forecast } = require('./forecastEngine');
const { readinessForDeal, readinessAggregate } = require('./followupReadiness');
const { conversion } = require('./conversionAnalytics');
const { repPerformance } = require('./repPerformance');
const { revenueRisk } = require('./revenueRisk');
const { recommendations } = require('./recommendationEngine');
const { auditPreview } = require('./auditPreview');

const S = red.safetyFlags;

function opportunityPreview(d) {
  const sc = scoreDeal(d);
  const fr = readinessForDeal(d);
  return {
    opportunityIdPreview: red.maskRef(d.id || 'opp_unknown'),
    maskedCustomerName: red.maskName(d.customerName || d.name),
    maskedPhone: red.maskPhone(d.phone),
    maskedEmail: red.maskEmail(d.email),
    stage: red.safeText(d.stage || 'New Lead'),
    valueBand: red.safeText(d.valueBand || red.amountBand(d.value).band),
    dealScore: sc.dealScore,
    closeProbabilityPreview: sc.closeProbabilityPreview,
    nextBestActionPreview: fr.suggestedFollowupType,
    followupReadiness: fr.followupReadinessScore,
    riskLevel: sc.scoreLevel,
    lastContactPreview: (Number(d.lastContactDays) || 0) + ' days ago (preview)',
    ownerPreview: red.maskName(d.owner || 'Unassigned'),
    previewOnly: true,
  };
}

function getRevenueOpsStatus() {
  return S({
    revenueOpsEnabled: true,
    feature: 'REVENUE_OPERATIONS_SALES_PIPELINE_COMMAND_CENTER',
    version: '1.0.0-preview',
    supportedStages: STAGES,
    supportedModules: ['pipeline', 'leads', 'opportunities', 'deal-score', 'forecast', 'followup',
      'conversion', 'rep-performance', 'revenue-risk', 'recommendations', 'compare', 'audit'],
    warnings: [], blockers: [],
  });
}

function getPipelineDashboardData() {
  const deals = getSampleOpportunities();
  return S({
    pipelineHealthPreview: pipelineHealth(deals),
    forecastPreview: forecast(deals),
    revenueRiskPreview: revenueRisk(deals),
    totalOpportunitiesPreview: deals.length,
    totalLeadsPreview: getSampleLeads().length,
    opportunitiesPreview: deals.map(opportunityPreview),
    warnings: [], blockers: [],
  });
}

function getLeadRegistryPreview() {
  const leads = getSampleLeads();
  return S({
    leadsPreview: leads.map((l) => red.sanitizeLeadInput(l)),
    totalPreview: leads.length,
    warnings: [], blockers: [],
  });
}

function getOpportunityRegistryPreview() {
  const deals = getSampleOpportunities();
  return S({
    opportunitiesPreview: deals.map(opportunityPreview),
    totalPreview: deals.length,
    warnings: [], blockers: [],
  });
}

function getOpportunityPreview(id) {
  const deals = getSampleOpportunities();
  const found = deals.find((d) => d.id === id || red.maskRef(d.id) === id);
  if (!found) return S({ found: false, opportunityPreview: null, warnings: ['opportunity_not_found_preview'], blockers: [] });
  return S({ found: true, opportunityPreview: opportunityPreview(found), warnings: [], blockers: [] });
}

function analyzeRevenueOpsPreview(input) {
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length)
    ? input.opportunities : getSampleOpportunities();
  return S({
    pipelineHealthPreview: pipelineHealth(deals),
    forecastPreview: forecast(deals),
    followupReadinessPreview: readinessAggregate(deals),
    conversionAnalyticsPreview: conversion(deals),
    revenueRiskPreview: revenueRisk(deals),
    recommendationsPreview: recommendations(deals),
    topOpportunitiesPreview: deals.map(opportunityPreview).sort((a, b) => b.dealScore - a.dealScore).slice(0, 5),
    warnings: [], blockers: [],
  });
}

function calculateDealScorePreview(input) {
  const deal = input && (input.opportunity || input.deal || input);
  return S(scoreDeal(deal || {}));
}
function calculatePipelineHealthPreview(input) {
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length) ? input.opportunities : getSampleOpportunities();
  return S(pipelineHealth(deals));
}
function calculateForecastPreview(input) {
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length) ? input.opportunities : getSampleOpportunities();
  return S(forecast(deals));
}
function calculateFollowupReadinessPreview(input) {
  if (input && (input.opportunity || input.deal)) return S(readinessForDeal(input.opportunity || input.deal));
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length) ? input.opportunities : getSampleOpportunities();
  return S(readinessAggregate(deals));
}
function calculateConversionAnalyticsPreview(input) {
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length) ? input.opportunities : getSampleOpportunities();
  return S(conversion(deals));
}
function calculateRepPerformancePreview(input) {
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length) ? input.opportunities : getSampleOpportunities();
  return S({ repsPreview: repPerformance(deals), totalRepsPreview: new Set(getSampleOpportunities().map((d) => d.owner)).size });
}
function calculateRevenueRiskPreview(input) {
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length) ? input.opportunities : getSampleOpportunities();
  return S(revenueRisk(deals));
}
function getRevenueRecommendationsPreview(input) {
  const deals = (input && Array.isArray(input.opportunities) && input.opportunities.length) ? input.opportunities : getSampleOpportunities();
  return S({ recommendationsPreview: recommendations(deals) });
}

function compareOpportunitiesPreview(input) {
  const a = (input && input.opportunityA) || {};
  const b = (input && input.opportunityB) || {};
  const sa = scoreDeal(a); const ra = readinessForDeal(a);
  const sb = scoreDeal(b); const rb = readinessForDeal(b);
  const aBetter = (sa.dealScore + sa.closeProbabilityPreview) >= (sb.dealScore + sb.closeProbabilityPreview);
  return S({
    opportunityAPreview: { dealScore: sa.dealScore, closeProbabilityPreview: sa.closeProbabilityPreview, followupReadinessScore: ra.followupReadinessScore },
    opportunityBPreview: { dealScore: sb.dealScore, closeProbabilityPreview: sb.closeProbabilityPreview, followupReadinessScore: rb.followupReadinessScore },
    betterPriorityPreview: aBetter ? 'opportunityA' : 'opportunityB',
    reasonPreview: aBetter
      ? 'Opportunity A has stronger stage progress, recent contact, and higher engagement.'
      : 'Opportunity B has stronger stage progress, recent contact, and higher engagement.',
    recommendations: recommendations([a, b].filter((x) => x && x.stage)),
  });
}

function getRevenueAuditPreview() {
  return S({ piiMasked: true, rawAuditExposed: false, auditPreview: auditPreview(), warnings: [], blockers: [] });
}

module.exports = {
  redactor: red,
  getRevenueOpsStatus,
  getPipelineDashboardData,
  getLeadRegistryPreview,
  getOpportunityRegistryPreview,
  getOpportunityPreview,
  analyzeRevenueOpsPreview,
  calculateDealScorePreview,
  calculatePipelineHealthPreview,
  calculateForecastPreview,
  calculateFollowupReadinessPreview,
  calculateConversionAnalyticsPreview,
  calculateRepPerformancePreview,
  calculateRevenueRiskPreview,
  getRevenueRecommendationsPreview,
  compareOpportunitiesPreview,
  getRevenueAuditPreview,
};
