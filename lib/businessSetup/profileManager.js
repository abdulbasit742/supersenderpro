const store = require('./store');


const BUSINESS_TYPES = [
  'ecommerce_store', 'ai_tools_reseller', 'digital_services_agency',
     'coaching_training', 'restaurant_food', 'real_estate', 'education_scholarship',
     'jobs_recruitment', 'fashion_clothing', 'mobile_accessories', 'wholesale_dealer',
     'local_shop', 'islamic_content', 'sticker_channel', 'affiliate_marketing',
     'custom_business',
];

function newId() { return 'biz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }


function defaults(input) {
  const now = new Date().toISOString();
     const i = input || {};
     return {
       id: i.id || newId(),
       businessName: i.businessName || 'Untitled Business',
       businessType: BUSINESS_TYPES.includes(i.businessType) ? i.businessType : 'custom_business',
       country: i.country || process.env.BUSINESS_SETUP_DEFAULT_COUNTRY || 'PK',
       language: i.language || process.env.BUSINESS_SETUP_DEFAULT_LANGUAGE || 'roman_urdu',
       timezone: i.timezone || 'Asia/Karachi',
       currency: i.currency || process.env.BUSINESS_SETUP_DEFAULT_CURRENCY || 'PKR',
       ownerNameSafe: i.ownerNameSafe || (i.ownerName ? String(i.ownerName).split(' ')[0] : ''),
       ownerPhoneMasked: store.maskPhone(i.ownerPhone || i.ownerPhoneMasked || ''),
       preferredChannels: i.preferredChannels || ['whatsapp'],
       enabledModules: i.enabledModules || [],
       selectedPreset: i.selectedPreset || null,
       setupStatus: i.setupStatus || 'draft',
       readinessScore: 0,
       blockers: [],
       warnings: [],
       dryRun: true,
       createdAt: now,
       updatedAt: now,
     };
}

function validate(input) {
  const errors = [];
     if (input.businessType && !BUSINESS_TYPES.includes(input.businessType)) errors.push('invalid_business_type');
     return errors;
}

function get() { return store.loadProfile(); }

function create(input) {
   const errors = validate(input || {});
   if (errors.length) return { ok: false, errors };
   const profile = defaults(input);
   store.saveProfile(profile);
   store.appendHistory({ kind: 'profile_created', businessType: profile.businessType });
   return { ok: true, profile: store.loadProfile() };
}

function update(patch) {
 const cur = store.loadProfile();
   if (!cur) return create(patch || {});
   const errors = validate(patch || {});
   if (errors.length) return { ok: false, errors };
   const next = Object.assign({}, cur, patch, {
     id: cur.id, createdAt: cur.createdAt, updatedAt: new Date().toISOString(), dryRun: true,
   });
   if (patch && patch.ownerPhone) next.ownerPhoneMasked = store.maskPhone(patch.ownerPhone);
   store.saveProfile(next);
   store.appendHistory({ kind: 'profile_updated' });
   return { ok: true, profile: store.loadProfile() };
}

module.exports = { BUSINESS_TYPES, defaults, validate, get, create, update, newId };
