 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('document_request', { attention: ['pending'], liveFlags: { liveDocumentDownload: false
 }, detail: () => ({ note: 'Document request status preview only; no download.' }) }) };
