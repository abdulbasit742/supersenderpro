'use strict';
const { make } = require('./_statusPreviewFactory');
module.exports = {
  forToken: make('quality_score', {
    attention: ['watch', 'poor'],
    detail: (s) => ({ scorePreview: Number(s.qualityScorePreview) || 0, note: 'Supplier quality score preview only.' })
  })
};
