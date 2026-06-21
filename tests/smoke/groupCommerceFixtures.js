'use strict';

// Synthetic group records (fake IDs only).
const groups = [
  { id: 'grp_demo_001', name: 'Demo Wholesale Group', membersCount: 3, paused: false },
     { id: 'grp_demo_002', name: 'Demo Dealers', membersCount: 5, paused: true },
];

// Synthetic inbound messages. Phone/email are obviously fake + masked.
const messages = [
  {
       id: 'msg_001',
       groupId: 'grp_demo_001',
       from: '+0000000000',            // fake, never a real number
       fromMasked: '+00******00',
       text: 'rate kya hai 1kg ka?',
       kind: 'inquiry',
     },
     {
       id: 'msg_002',
       groupId: 'grp_demo_001',
       from: '+0000000001',
       fromMasked: '+00******01',
       text: 'stock available? 50 units chahiye',
       kind: 'order_intent',
     },
     {
       id: 'msg_003',
       groupId: 'grp_demo_002',
       from: '+0000000002',
       fromMasked: '+00******02',
       text: 'http://spam.example/win-free-prize click now',
       kind: 'link_spam',
     },
];

// Command samples the router must support.
const commands = ['/help', '/status', '/pause 5m', '/resume'];

// Expected normalized shape from messageAnalyzer.analyze().
// Smoke test only checks that these KEYS exist, not exact values.

const expectedAnalysisKeys = ['intent', 'entities', 'normalizedText', 'flags'];

// Patterns that must NEVER appear in any API response or log line.
// (full 10+ digit phone, email, bearer/token-ish strings)
const forbiddenLeakPatterns = [
    /\b\d{10,15}\b/,                       // raw long phone numbers
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, // emails
    /(bearer\s+[a-z0-9._-]{12,})/i,        // bearer tokens
    /(sk-[a-z0-9]{16,})/i,                 // api-key-ish
];

module.exports = {
 groups,
    messages,
    commands,
    expectedAnalysisKeys,
    forbiddenLeakPatterns,
};
