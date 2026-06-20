// lib/voiceAI/adminCommands.js — WhatsApp-style admin command handlers (Urdu/English mixed).
// Returns reply strings only. Hooks into an EXISTING admin command system; no new bot.

const { config } = require('./config');
const providerRegistry = require('./providerRegistry');
const queue = require('./voiceQueue');
const templates = require('./templates');
const consentStore = require('./consentStore');
const reportBuilder = require('./reportBuilder');
const { maskId } = require('./redaction');

function handle(command, args = []) {
  const cmd = String(command || '').trim().toLowerCase();
  switch (cmd) {
    case '!voicestatus': {
      const pending = queue.pending().length;
      return `Voice AI status: Dry-run ${config.dryRun ? 'ON' : 'OFF'} hai. ${pending} drafts pending hain. Live sending ${config.effective.liveSend ? 'ENABLED' : 'disabled'} hai.`;
    }
    case '!voiceproviders': {
      const ready = providerRegistry.list().filter((p) => p.enabled).map((p) => p.label).join(', ');
      return `Available providers: ${ready || 'mock_dry_run'}. Default: ${config.defaultProvider}.`;
    }
    case '!voicequeue': {
      const items = queue.pending().slice(0, 5).map((i) => `${i.id} (${i.type})`).join(', ');
      return `Pending voice drafts: ${queue.pending().length}. ${items ? 'IDs: ' + items : ''}`;
    }
    case '!voiceapprove': {
      if (!args[0]) return 'Usage: !voiceapprove [id]';
      const item = queue.approve(args[0], 'admin');
      return item ? `Approved ${args[0]}. (Dry-run — koi live send nahi hoga.)` : `Draft ${args[0]} nahi mila.`;
    }
    case '!voicereject': {
      if (!args[0]) return 'Usage: !voicereject [id]';
      const item = queue.reject(args[0], 'admin', 'admin_command');
      return item ? `Rejected ${args[0]}.` : `Draft ${args[0]} nahi mila.`;
    }
    case '!voicepreview': {
      const text = args.join(' ');
      if (!text) return 'Usage: !voicepreview [text]';
      return `Preview (dry-run): "${text.slice(0, 120)}" — voice ${maskId('default')}. Approval required.`;
    }
    case '!voicetemplate': {
      const cat = args[0];
      const list = templates.list({ category: cat }).slice(0, 3).map((t) => `${t.id}: ${t.text}`).join(' | ');
      return list || `Koi template nahi mila category "${cat || ''}" ke liye.`;
    }
    case '!voicedigest': {
      const d = reportBuilder.dailyDigest();
      return `Aaj: ${d.voiceConversations} voice conversations, ${d.pendingApprovals} approvals pending, ${d.negativeSentiment} negative.`;
    }
    case '!voiceoptout': {
      if (!args[0]) return 'Usage: !voiceoptout [customer]';
      consentStore.optOut(args[0], 'admin');
      return `Customer ${args[0]} ko voice se opt-out kar diya.`;
    }
    case '!voiceconsent': {
      if (!args[0]) return 'Usage: !voiceconsent [customer]';
      const c = consentStore.get(args[0]);
      return `Consent: voiceMsg=${c.voiceMessagesOptIn}, transcription=${c.transcriptionOptIn}, external=${c.externalProviderOptIn}, clone=${c.voiceCloneOptIn}.`;
    }
    case '!voiceagent': {
      const onoff = (args[0] || '').toLowerCase();
      if (onoff === 'on') return 'Voice agent ON (drafts banayega, lekin approval ke baghair send nahi karega).';
      if (onoff === 'off') return 'Voice agent OFF.';
      return 'Usage: !voiceagent on|off';
    }
    default:
      return null; // not a voice command
  }
}

const COMMANDS = ['!voicestatus', '!voiceproviders', '!voicequeue', '!voiceapprove', '!voicereject',
  '!voicepreview', '!voicetemplate', '!voicedigest', '!voiceoptout', '!voiceconsent', '!voiceagent'];

module.exports = { handle, COMMANDS };
