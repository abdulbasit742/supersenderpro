// lib/staffPortal/documentRequestPreview.js — Safe document status + request preview. No download, no share.
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
  return safeResponse({ liveDocumentDownload: false, liveShare: false, documentsPreview: docs, warnings });
}
function getDocumentStatusPreview(input = {}) {
  const list = listDocuments(input);
  return safeResponse({ liveDocumentDownload: false, liveShare: false, documentPreview: (list.documentsPreview || [])[0] || {}, warnings: list.warnings });
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
module.exports = { listDocuments, getDocumentStatusPreview, createDocumentRequestPreview };
