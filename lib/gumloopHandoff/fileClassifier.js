 'use strict';
 /**
     * fileClassifier.js — classify a relative path into SAFE_TO_COPY / NEVER_COPY /
     * UNKNOWN_REVIEW, plus risk markers. Pure function; takes a path + optional
     * lightweight metadata. No filesystem access here (callers supply the list).
     */
 const rules = require('./safeCopyRules');
 const pathSafety = require('./pathSafety');


 function classify(relPathRaw, meta) {
      meta = meta || {};

  const rel = pathSafety.toRelative(relPathRaw);
  const markers = [];
  const result = { path: rel, classification: 'unknown_review', markers };

  if (!pathSafety.isSafeRelative(rel)) {
      markers.push('path_unsafe');
      result.classification = 'unknown_review';
      result.reason = 'absolute_or_traversal_path';
      return result;
  }


  if (rules.matchesNeverCopy(rel)) {
    result.classification = 'never_copy';
      if (/(^|\/)\.env($|\.)/i.test(rel) || /token|secret|\.(pem|key)$/i.test(rel)) markers.push('secret_risk');
      if (rules.RUNTIME_DATA_REGEX.some((re) => re.test(rel))) markers.push('runtime_data_risk');
      if (/(^|\/)node_modules\//i.test(rel)) markers.push('vscode_handoff_risk');
      result.reason = 'matches_never_copy_rule';
      return result;
  }


  if (rules.RUNTIME_DATA_REGEX.some((re) => re.test(rel))) {
      result.classification = 'never_copy';
      markers.push('runtime_data_risk');
      result.reason = 'runtime_data_pattern';
      return result;
  }


if (rules.SAFE_ARTIFACT_MD.test(rel)) { result.classification = 'safe_to_copy'; markers.push('safe_report'); return
result; }
  if (rules.SAFE_ARTIFACT_JSON.test(rel)) {
    // safe only if redacted + non-private; default to review unless caller asserts redacted
  if (meta.redacted && !meta.containsPII && !meta.containsSecrets) { result.classification = 'safe_to_copy';
markers.push('redacted_report'); }
      else { result.classification = 'unknown_review'; markers.push('artifact_json_needs_review'); }
      return result;
  }


  if (rules.underSafeRoot(rel)) {
    result.classification = 'safe_to_copy';
      if (meta.containsSecrets) { result.classification = 'unknown_review'; markers.push('secret_risk'); }
      if (meta.containsPII) { result.classification = 'unknown_review'; markers.push('pii_risk'); }
      if (meta.hasMergeConflict) { result.classification = 'unknown_review'; markers.push('conflict_risk'); }
      return result;
  }


  markers.push('outside_expected_structure');
  return result;
}

function classifyMany(list) {
const out = { safeToCopy: [], neverCopy: [], unknownReview: [] };
  (list || []).forEach((item) => {
    const rel = typeof item === 'string' ? item : item.path;
      const meta = typeof item === 'string' ? {} : item;
      const r = classify(rel, meta);
      if (r.classification === 'safe_to_copy') out.safeToCopy.push(r);
      else if (r.classification === 'never_copy') out.neverCopy.push(r);

        else out.unknownReview.push(r);
      });
      return out;
 }


 module.exports = { classify, classifyMany };
