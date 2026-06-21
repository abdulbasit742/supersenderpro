 'use strict';
 const { make } = require('./_statusPreviewFactory');
 const service = require('./customerPortalService');
 module.exports = { forToken: function (previewToken) { const r = make('loyalty', { detail: (c) => ({ pointsPreview:
 Number(c.loyaltyPointsPreview) || 0, note: 'Loyalty status preview only; no redemption.' }) })(previewToken); return r; }
 };
