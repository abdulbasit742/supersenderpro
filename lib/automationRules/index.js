// lib/automationRules/index.js — Automation Rules Engine (barrel export).
//
// If-this-then-that automation that ties the whole product together: rules listen for an event
// (message.received, payment.succeeded, nps.detractor, sla.breach, link.clicked, ...), evaluate a
// SAFE JSON condition (all/any of leaf comparisons — NO eval), and run an ordered action pipeline
// that delegates to OTHER departments: add_tag (#12), set_consent (#38), enroll_drip (#6),
// assign_agent (#44), raise_alert (#28), track_event (#9/#46), send_template (#36 via scheduler
// #17), schedule_message (#17), webhook_emit (#20). Call emit(event, payload) from anywhere an
// event happens.
//
// SAFETY: this engine performs NO direct sends; each action delegates to a department that is
// already draft/advisory-safe (consent + sender-health are honored upstream by the send path).
// Set AUTOMATION_RULES_DRY_RUN=true to plan + log actions without executing. Per-rule throttle
// prevents action storms. Missing target depts degrade to 'skipped', never throw.

const { config, KNOWN_EVENTS, ACTION_TYPES } = require('./config');
const engine = require('./engine');

module.exports = {
 config, KNOWN_EVENTS, ACTION_TYPES,
 store: require('./store'),
 conditionMatcher: require('./conditionMatcher'),
 actions: require('./actions'),
 ruleStore: require('./ruleStore'),
 engine,
 doctor: require('./doctor'),
 // convenience
 emit: engine.emit,
};
