// lib/voiceAI/voiceProfiles.js — Named voice/tone profiles. Custom (cloned) profiles are
// flagged consentRequired and disabled by default.

const profiles = {
  default_business: { id: 'default_business', label: 'Business Neutral', tone: 'professional', clone: false, consentRequired: false },
  warm_support: { id: 'warm_support', label: 'Warm Support', tone: 'friendly', clone: false, consentRequired: false },
  energetic_sales: { id: 'energetic_sales', label: 'Energetic Sales', tone: 'enthusiastic', clone: false, consentRequired: false },
  calm_reminder: { id: 'calm_reminder', label: 'Calm Reminder', tone: 'calm', clone: false, consentRequired: false },
  custom_clone: { id: 'custom_clone', label: 'Custom Cloned Voice', tone: 'custom', clone: true, consentRequired: true, enabledByDefault: false },
};

function list() { return Object.values(profiles); }
function get(id) { return profiles[id] || profiles.default_business; }

module.exports = { list, get, profiles };
