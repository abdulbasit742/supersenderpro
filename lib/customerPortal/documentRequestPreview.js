 'use strict';
 const { make } = require('./_statusPreviewFactory');
 // Document area: status preview only; downloads are explicitly disabled.
 module.exports = { forToken: make('document_request', { attention: ['pending'], detail: () => ({ liveDocumentDownload:
 false, note: 'Document request status preview only; no download.' }) }) };
