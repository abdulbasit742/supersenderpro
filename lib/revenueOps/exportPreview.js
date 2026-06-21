// lib/revenueOps/exportPreview.js — masked export PREVIEW only. Writes no file, exposes no raw PII.
'use strict';
const { maskName, maskPhone, maskEmail, amountBand, safeText } = require('./redactor');
const { scoreDeal } = require('./dealScoring');

function exportPreview(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const columns = ['opportunityId', 'customerNameMasked', 'phoneMasked', 'emailMasked', 'stage', 'valueBand', 'dealScore'];
  const rowsPreview = list.slice(0, 50).map((d) => ({
    opportunityId: safeText(d.id || 'opp'),
    customerNameMasked: maskName(d.customerName || d.name),
    phoneMasked: maskPhone(d.phone),
    emailMasked: maskEmail(d.email),
    stage: safeText(d.stage || 'New Lead'),
    valueBand: d.valueBand || amountBand(d.value).band,
    dealScore: scoreDeal(d).dealScore,
  }));
  return {
    formatPreview: 'csv_preview',
    columns,
    rowsPreview,
    rowCountPreview: rowsPreview.length,
    fileWritten: false,
    note: 'Preview only. No file was written and no raw PII is included. Values are masked/banded.',
  };
}
module.exports = { exportPreview };
