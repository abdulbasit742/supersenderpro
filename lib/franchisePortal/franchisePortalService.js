// lib/franchisePortal/franchisePortalService.js — Central service: portal status, lookup, and re-export of all previews.
// Everything is dry-run / preview-only. No external calls, no live mutations, no live sends, PII masked.
'use strict';

const store = require('./store');
const model = require('./franchisePortalModel');
const { redactFranchise } = require('./redactor');

const profile = require('./franchiseProfilePreview');
const tier = require('./tierStatusPreview');
const outletAccount = require('./outletAccountStatusPreview');
const outletList = require('./outletListPreview');
const sales = require('./salesSummaryPreview');
const target = require('./targetAchievementPreview');
const royalty = require('./royaltySummaryPreview');
const royaltyPay = require('./royaltyPaymentStatusPreview');
const payable = require('./outstandingPayablePreview');
const inventory = require('./inventoryAllocationPreview');
const replenishment = require('./replenishmentDraftPreview');
const orders = require('./orderStatusPreview');
const settlement = require('./settlementStatusPreview');
const fund = require('./marketingFundPreview');
const headcount = require('./headcountPreview');
const compliance = require('./complianceChecklistPreview');
const territory = require('./territoryAssignmentPreview');
const contracts = require('./contractStatusPreview');
const documents = require('./documentRequestPreview');
const support = require('./supportRequestPreview');
const drafts = require('./messageDrafts');
const audit = require('./auditPreview');
const summary = require('./statusSummaryPreview');

const SUPPORTED_MODULES = [
  'profile', 'tier', 'outlet-account', 'outlets', 'sales-summary', 'target-achievement', 'royalty',
  'royalty-payment', 'outstanding-payable', 'inventory-allocation', 'orders', 'settlements',
  'marketing-fund', 'headcount', 'compliance', 'territory', 'contracts', 'documents',
];

function getFranchisePortalStatus() {
  return model.safeResponse({
    liveActionsEnabled: false,
    franchisePortalPublicLive: false,
    piiMasked: true,
    externalCallsEnabled: false,
    supportedModules: SUPPORTED_MODULES,
    accessModes: model.ACCESS_MODES,
    portalStatuses: model.PORTAL_STATUSES,
    agreementStatuses: model.AGREEMENT_STATUSES,
    tiers: model.TIERS,
  });
}

function lookupFranchisePreview(input = {}) {
  const { franchise, accessMode } = store.findFranchisePreview(input);
  const r = redactFranchise(franchise);
  audit.recordPreview('lookup_preview', franchise, 'franchise_portal');
  return model.safeResponse({
    liveAuthEnabled: false,
    lookupMode: accessMode,
    franchiseNameSafe: r.franchiseNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    franchiseTokenPreview: 'franchise_preview_****',
    warnings: ['auth_preview_only', 'pii_masked'],
  });
}

function getFranchiseSummaryPreview(input = {}) {
  audit.recordPreview('summary_preview', store.demoFranchise(), 'franchise_portal');
  return summary.getFranchiseSummaryPreview(input);
}

function getFranchiseProfilePreview(i) { return profile.getFranchiseProfilePreview(i); }
function getTierStatusPreview(i) { return tier.getTierStatusPreview(i); }
function getOutletAccountStatusPreview(i) { return outletAccount.getOutletAccountStatusPreview(i); }
function getSalesSummaryPreview(i) { return sales.getSalesSummaryPreview(i); }
function getTargetAchievementPreview(i) { return target.getTargetAchievementPreview(i); }
function getRoyaltySummaryPreview(i) { return royalty.getRoyaltySummaryPreview(i); }
function getRoyaltyPaymentStatusPreview(i) { return royaltyPay.getRoyaltyPaymentStatusPreview(i); }
function getOutstandingPayablePreview(i) { return payable.getOutstandingPayablePreview(i); }
function getInventoryAllocationPreview(i) { return inventory.getInventoryAllocationPreview(i); }
function createReplenishmentDraftPreview(i) { audit.recordPreview('replenishment_draft_preview', store.demoFranchise()); return replenishment.createReplenishmentDraftPreview(i); }
function getOrderStatusPreview(i) { return orders.getOrderStatusPreview(i); }
function getMarketingFundPreview(i) { return fund.getMarketingFundPreview(i); }
function getHeadcountPreview(i) { return headcount.getHeadcountPreview(i); }
function getComplianceChecklistPreview(i) { return compliance.getComplianceChecklistPreview(i); }
function getTerritoryAssignmentPreview(i) { return territory.getTerritoryAssignmentPreview(i); }
function getContractStatusPreview(i) { return contracts.listContracts(i); }
function createDocumentRequestPreview(i) { audit.recordPreview('document_request_preview', store.demoFranchise()); return documents.createDocumentRequestPreview(i); }
function createSupportRequestPreview(i) { audit.recordPreview('support_request_preview', store.demoFranchise()); return support.createSupportRequestPreview(i); }
function createMessageDraftPreview(i) { audit.recordPreview('message_draft_preview', store.demoFranchise()); return drafts.createMessageDraftPreview(i); }
function getAuditPreview() { return audit.getAuditPreview(); }

module.exports = {
  SUPPORTED_MODULES,
  getFranchisePortalStatus,
  lookupFranchisePreview,
  getFranchiseSummaryPreview,
  getFranchiseProfilePreview,
  getTierStatusPreview,
  getOutletAccountStatusPreview,
  listOutlets: outletList.listOutlets,
  getSalesSummaryPreview,
  getTargetAchievementPreview,
  getRoyaltySummaryPreview,
  getRoyaltyPaymentStatusPreview, listRoyaltyInvoices: royaltyPay.listRoyaltyInvoices,
  getOutstandingPayablePreview,
  getInventoryAllocationPreview,
  createReplenishmentDraftPreview,
  getOrderStatusPreview, listOrders: orders.listOrders,
  listSettlements: settlement.listSettlements,
  getMarketingFundPreview,
  getHeadcountPreview,
  getComplianceChecklistPreview,
  getTerritoryAssignmentPreview,
  getContractStatusPreview, listContracts: contracts.listContracts,
  listDocuments: documents.listDocuments,
  createDocumentRequestPreview,
  createSupportRequestPreview,
  createMessageDraftPreview,
  getAuditPreview,
};
