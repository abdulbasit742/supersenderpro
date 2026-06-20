// lib/customerPortal/documentRequestPreview.js — Safe document status + request previews. No download, no share.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef, redactDocument, safeText } = require('./redactor');

function listDocuments(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const warnings = [];
  const docs = (customer.documents || []).map((d) => {
    if (d.status === 'missing') warnings.push('document_missing');
    return redactDocument(d);
  });
  return safeResponse({ liveDocumentDownload: false, liveShare: false, documentsPreview: docs, warnings });
}

function getDocumentStatusPreview(input = {}) {
  const list = listDocuments(input);
  const first = (list.documentsPreview || [])[0] || {};
  return safeResponse({ liveDocumentDownload: false, liveShare: false, documentPreview: first, warnings: list.warnings });
}

// Create a PREVIEW of a document request — never downloads or shares anything.
function createDocumentRequestPreview(input = {}) {
  return safeResponse({
    liveDocumentDownload: false,
    liveShare: false,
    documentIdPreview: maskRef(input.documentId || 'doc', 'doc'),
    requestStatusPreview: 'request_preview',
    notePreview: safeText(input.note || 'Document request draft — no download or share occurs.'),
  });
}

module.exports = { listDocuments, getDocumentStatusPreview, createDocumentRequestPreview };
