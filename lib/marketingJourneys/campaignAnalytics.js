 'use strict';
 /**
     * campaignAnalytics.js — preview-only analytics cards. All values are clearly
     * labeled estimates; nothing is measured from live sends.
  */
 function overview() {
      return {
        note: 'Preview values only. No live sends measured.',
        cards: [
          { key: 'journeys_active', label: 'Active journeys', value: 8 },
           { key: 'emails_drafted', label: 'Emails drafted', value: 1240, estimate: true },
           { key: 'sms_drafted', label: 'SMS drafted', value: 430, estimate: true },
           { key: 'open_rate', label: 'Est. open rate', value: '41%', estimate: true },
           { key: 'click_rate', label: 'Est. click rate', value: '9.2%', estimate: true },

     { key: 'unsub_rate', label: 'Est. unsub rate', value: '0.4%', estimate: true },
     { key: 'consent_coverage', label: 'Consent coverage', value: '92%', estimate: true },
  ],
  perJourney: [
    { id: 'welcome_series', sends: 320, openRate: '52%', estimate: true },
     { id: 'abandoned_cart', sends: 180, openRate: '47%', estimate: true },
     { id: 'winback', sends: 140, openRate: '33%', estimate: true },
  ],
};
}
module.exports = { overview };
