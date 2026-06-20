// lib/voiceAI/templates.js — Reusable voice/text templates in Urdu / Roman Urdu / English.
// Variables use {{var}} syntax. safeForAutoSend is conservative by default.

function t(id, category, language, tone, text, variables = [], safeForAutoSend = false) {
  return { id, category, language, tone, text, variables, safeForAutoSend, approvalRequired: !safeForAutoSend, notes: '' };
}

const TEMPLATES = [
  t('welcome_ru', 'welcome', 'roman_urdu', 'friendly', 'Assalam o Alaikum {{name}}! {{business}} mein khush aamdeed.', ['name', 'business'], true),
  t('welcome_en', 'welcome', 'english', 'friendly', 'Hello {{name}}! Welcome to {{business}}.', ['name', 'business'], true),
  t('product_info_ru', 'product information', 'roman_urdu', 'professional', '{{product}} ke baare mein: {{details}}. Mazeed maloomat chahiye?', ['product', 'details']),
  t('price_ru', 'price explanation', 'roman_urdu', 'professional', '{{product}} ki price Rs {{price}} hai. Aaj {{discount}} discount bhi hai.', ['product', 'price', 'discount']),
  t('order_confirm_ru', 'order confirmation', 'roman_urdu', 'friendly', 'Order confirm! {{product}} x{{qty}}, total Rs {{total}}. Shukria {{name}}.', ['product', 'qty', 'total', 'name']),
  t('payment_pending_ru', 'payment pending', 'roman_urdu', 'calm', 'Reminder: Rs {{amount}} ki payment pending hai. Aasani ke liye link bhej dein?', ['amount']),
  t('payment_received_ru', 'payment received', 'roman_urdu', 'friendly', 'Payment mil gayi — Rs {{amount}}. Shukria! Order process ho raha hai.', ['amount'], true),
  t('renewal_ru', 'renewal reminder', 'roman_urdu', 'professional', '{{plan}} {{days}} din mein expire ho raha hai. Renew karein?', ['plan', 'days']),
  t('abandoned_cart_ru', 'abandoned cart', 'roman_urdu', 'enthusiastic', '{{name}}, aap ka cart wait kar raha hai! {{product}} abhi order karein.', ['name', 'product']),
  t('support_handoff_ru', 'support handoff', 'roman_urdu', 'friendly', 'Aap ka masla team ko de diya hai. Jald rabta karenge.', []),
  t('complaint_apology_ru', 'complaint apology', 'roman_urdu', 'apologetic', 'Bohat maazrat {{name}}. Hum {{issue}} ko priority par hal kar rahe hain.', ['name', 'issue']),
  t('delivery_update_ru', 'delivery update', 'roman_urdu', 'professional', 'Aap ka parcel {{status}} hai. Expected delivery: {{date}}.', ['status', 'date']),
  t('stock_unavailable_ru', 'stock unavailable', 'roman_urdu', 'calm', 'Maazrat, {{product}} abhi stock mein nahi. {{date}} tak aa jayega.', ['product', 'date']),
  t('ecommerce_deal_ru', 'ecommerce deal', 'roman_urdu', 'enthusiastic', 'Aaj ki deal! {{product}} sirf Rs {{price}} — limited time!', ['product', 'price']),
  t('channel_promo_ru', 'channel promo', 'roman_urdu', 'enthusiastic', 'Naya update channel par! {{title}} — abhi dekhein.', ['title']),
  t('group_announcement_ru', 'group admin announcement', 'roman_urdu', 'professional', 'Announcement: {{message}}', ['message']),
  t('seller_followup_ru', 'seller follow-up', 'roman_urdu', 'professional', '{{seller}}, aap ki listing par {{count}} naye buyers aaye hain.', ['seller', 'count']),
  t('buyer_followup_ru', 'buyer follow-up', 'roman_urdu', 'friendly', '{{name}}, aap ki pasand ke items wapas available hain!', ['name']),
  t('daily_digest_vo', 'daily digest voiceover', 'roman_urdu', 'professional', 'Aaj ka business summary: {{orders}} orders, Rs {{sales}} sales, {{pending}} pending.', ['orders', 'sales', 'pending']),
];

function list({ language = null, category = null } = {}) {
  return TEMPLATES.filter((x) => (!language || x.language === language) && (!category || x.category === category));
}
function get(id) { return TEMPLATES.find((x) => x.id === id) || null; }

module.exports = { list, get, TEMPLATES };
