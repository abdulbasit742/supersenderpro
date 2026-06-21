'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['lib/groupCommerce/adapters/socialAdapter.js', 'src/modules/social']);
  if (!present) return b.unavailable('Social');
  const tokenMissing = !b.envSet('FACEBOOK_ACCESS_TOKEN') && !b.envSet('INSTAGRAM_ACCESS_TOKEN') &&
!b.envSet('LINKEDIN_ACCESS_TOKEN');
  return tokenMissing
    ? b.record('warning', 'Social present but no provider token set', { category: 'social', recommendedFix: 'Set social provider token(s) in .env (never commit).' })
    : b.record('healthy', 'Social present with at least one provider token', { category: 'social' });
}
module.exports = { health };
