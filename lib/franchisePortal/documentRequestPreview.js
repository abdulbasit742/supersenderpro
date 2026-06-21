// lib/franchisePortal/documentRequestPreview.js — Safe document status + request previews. No download, no share.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, redactDocument, safeText } = require('./redactor');

function listDocuments(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const warnings = [];
  const docs = (franchise.documents || []).map((d) => {
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
