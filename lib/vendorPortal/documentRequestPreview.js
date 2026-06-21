// lib/vendorPortal/documentRequestPreview.js — Safe document status + request previews. No download, no share.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef, redactDocument, safeText } = require('./redactor');

function listDocuments(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const warnings = [];
  const docs = (vendor.documents || []).map((d) => {
    if (d.status === 'missing') warnings.push('document_missing_preview');
    return redactDocument(d);
  });
  return safeResponse({ liveDocumentDownload: false, liveShare: false, documentsPreview: docs, warnings: [...new Set(warnings)] });
}

function createDocumentRequestPreview(input = {}) {
  return safeResponse({
    liveDocumentDownload: false,
    liveShare: false,
    documentIdPreview: maskRef(input.documentId || 'doc', 'doc'),
    requestStatusPreview: 'request_preview',
    notePreview: safeText(input.note || 'Document request draft — no download or share occurs.'),
  });
}
module.exports = { listDocuments, createDocumentRequestPreview };
