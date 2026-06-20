// lib/staffPortal/documentRequestPreview.js — Safe document status + request previews. No download, no share.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, redactDocument, safeText } = require('./redactor');

function listDocuments(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const docs = (staff.documents || []).map((d) => {
    if (d.status === 'missing') warnings.push('document_missing');
    return redactDocument(d);
  });
  const missing = docs.filter((d) => d.statusPreview === 'missing').map((d) => d.documentIdPreview);
  return safeResponse({
    liveDocumentDownload: false,
    liveShare: false,
    documentsPreview: docs,
    requiredDocumentsPreview: docs.map((d) => d.documentIdPreview),
    missingDocumentsPreview: missing,
    warnings,
  });
}

function getDocumentStatusPreview(input = {}) {
  const list = listDocuments(input);
  const first = (list.documentsPreview || [])[0] || {};
  return safeResponse({ liveDocumentDownload: false, liveShare: false, documentPreview: first, warnings: list.warnings });
}

function createDocumentRequestPreview(input = {}) {
  return safeResponse({
    liveDocumentDownload: false,
    liveShare: false,
    documentIdPreview: maskRef(input.documentId || 'doc', 'doc'),
    requestStatusPreview: 'request_preview',
    requiredDocumentsPreview: [],
    missingDocumentsPreview: [],
    notePreview: safeText(input.note || 'Document request draft — no download or share occurs.'),
  });
}

module.exports = { listDocuments, getDocumentStatusPreview, createDocumentRequestPreview };
