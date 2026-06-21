const store = require('./store');
const presets = require('./industryPresets');

const SECTIONS = [
  'business_profile', 'whatsapp_connection', 'whatsapp_cloud_worker', 'admin_numbers',
     'ai_provider', 'payment_methods', 'ecommerce_connection', 'social_connections',
     'channel_automation', 'voice_ai', 'customer360_privacy', 'owner_command',
     'playbook_templates', 'flow_studio', 'security_scan', 'launch_readiness', 'backup_export',
];

const STATUSES = ['not_started', 'missing', 'configured', 'warning', 'blocked', 'skipped', 'verified'];

// Library of checklist item templates by section.
const ITEM_TEMPLATES = {
  business_profile: { title: 'Complete business profile', description: 'Name, type, country, language, currency.',
linkedRoute: '/business-setup.html', linkedDoc: 'docs/BUSINESS_SETUP_WIZARD.md' },
  whatsapp_connection: { title: 'Connect WhatsApp', description: 'Link a WhatsApp number (Cloud API or local worker).',
linkedRoute: '/whatsapp-cloud-setup.html', linkedDoc: 'docs/WHATSAPP_CLOUD_SETUP_WIZARD.md' },
  whatsapp_cloud_worker: { title: 'Configure Cloud / local worker', description: 'Choose transport and verify webhook.',
linkedRoute: '/whatsapp-cloud-setup.html', linkedDoc: 'docs/WHATSAPP_CLOUD_PRODUCTION_CHECKLIST.md' },
  admin_numbers: { title: 'Set admin numbers', description: 'Add admin phone numbers for command + alerts.', linkedRoute:
'/business-setup.html' },
  ai_provider: { title: 'Configure AI provider', description: 'Set provider/key via env or use mock fallback.',
linkedRoute: '/business-setup.html' },
  payment_methods: { title: 'Configure payment methods', description: 'Select accepted methods (no secrets stored here).', linkedRoute: '/business-setup.html' },
  ecommerce_connection: { title: 'Connect ecommerce provider', description: 'Link catalog/orders source.', linkedRoute:
'/business-setup.html' },
  social_connections: { title: 'Connect social accounts', description: 'Authorize via the integration wizard.',
linkedRoute: '/business-setup.html' },
  channel_automation: { title: 'Set up channel automation', description: 'Define sources + approval queue.', linkedRoute:
'/business-setup.html' },
  voice_ai: { title: 'Configure Voice AI (consent-safe)', description: 'Enable only with consent guard on.', linkedRoute:
'/business-setup.html' },
  customer360_privacy: { title: 'Customer 360 privacy setup', description: 'Confirm PII masking + retention.',
linkedRoute: '/business-setup.html' },
  owner_command: { title: 'Enable Owner Command digest', description: 'Pick daily briefing format + time.', linkedRoute:
'/owner-command.html' },
  playbook_templates: { title: 'Enable recommended playbooks', description: 'Review and enable preset playbooks (dry-run).', linkedRoute: '/business-setup.html' },
  flow_studio: { title: 'Register Flow Studio triggers', description: 'Add recommended flows (do not auto-enable).',
linkedRoute: '/business-setup.html' },
  security_scan: { title: 'Run security scan', description: 'Confirm no exposed secrets.', linkedRoute: '/business-setup.html' },
 launch_readiness: { title: 'Run launch readiness check', description: 'Score must reach pilot/launch ready.',
linkedRoute: '/business-setup.html' },
 backup_export: { title: 'Configure backup / export', description: 'Enable snapshots + export setup profile.',
linkedRoute: '/business-setup.html' },
};


function itemId(section) { return 'chk_' + section; }

function build(presetId) {
 const preset = presets.get(presetId) || presets.get('custom_business');
    const required = new Set(preset.requiredChecklist || []);
    const optional = new Set(preset.optionalChecklist || []);
    const blockers = new Set(preset.launchBlockers || []);
    const now = new Date().toISOString();


    // include required + optional sections, in canonical section order
 const wanted = SECTIONS.filter((s) => required.has(s) || optional.has(s) || s === 'launch_readiness' || s ===
'business_profile');
    return wanted.map((section) => {
      const tpl = ITEM_TEMPLATES[section] || { title: section, description: '' };
      return {
        id: itemId(section), section,
          title: tpl.title, description: tpl.description,
          status: 'not_started',
          required: required.has(section) || section === 'business_profile',
          blocker: blockers.has(section),
          fixSteps: tpl.fixSteps || ['Open ' + (tpl.linkedRoute || 'dashboard'), 'Complete this section'],
          linkedRoute: tpl.linkedRoute || null,
          linkedDoc: tpl.linkedDoc || null,
          dryRun: true,
          updatedAt: now,
      };
    });
}

function generate(presetId) {
    const items = build(presetId);
    const state = store.loadState();
    state.checklist = {};
    items.forEach((it) => { state.checklist[it.id] = it; });
    store.saveState(state);
    store.appendHistory({ kind: 'checklist_generated', presetId, count: items.length });
    return items;
}

function list() { return Object.values(store.loadState().checklist || {}); }


function mark(id, status) {
    if (!STATUSES.includes(status)) return { ok: false, errors: ['invalid_status'] };
    const state = store.loadState();
    const it = (state.checklist || {})[id];
    if (!it) return { ok: false, errors: ['not_found'] };
    it.status = status; it.updatedAt = new Date().toISOString();
    store.saveState(state);
    store.appendHistory({ kind: 'checklist_marked', id, status });
    return { ok: true, item: it };

}


module.exports = { SECTIONS, STATUSES, ITEM_TEMPLATES, build, generate, list, mark, itemId };
