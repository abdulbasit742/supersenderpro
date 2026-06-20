// lib/complianceCenter/complianceRules.js — Static compliance rule definitions.
module.exports = {
  consentFirst: { id:'consent_first', label:'Consent required before outreach', severity:'high' },
  quietHours: { id:'quiet_hours', label:'No messages during quiet hours', severity:'medium' },
  optOutHonored: { id:'opt_out_honored', label:'Opt-outs always honored', severity:'high' },
  noBulkUnsolicited: { id:'no_bulk_unsolicited', label:'No unsolicited bulk messaging', severity:'high' },
};
