// lib/templateLibrary/index.js — Message Template Library (barrel export).
//
// Reusable message templates with typed {{variables}} (and {{var|defaults}}), categories + tags,
// versioning + history, an approval workflow (draft -> pending_review -> approved -> archived),
// and render() with strict variable validation + per-template usage tracking. Other departments
// (drip #6, scheduler #17, A/B #35, broadcast) render a template id to get the text to send.
//
// SAFETY: JSON-backed. Editing an approved template's body bumps the version and sends it back to
// draft (changes get re-reviewed). render() can be gated to approved-only via
// TEMPLATE_LIBRARY_REQUIRE_APPROVED. Templates are archived, never hard-deleted.

const { config, STATUSES } = require('./config');

module.exports = {
 config, STATUSES,
 store: require('./store'),
 variables: require('./variables'),
 templateStore: require('./templateStore'),
 renderer: require('./renderer'),
 doctor: require('./doctor'),
 // convenience
 render: require('./renderer').render,
};
