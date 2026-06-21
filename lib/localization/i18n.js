'use strict';
/**
 * Localization - message catalog + translator (Phase 1).
 */
const CATALOG = {
  en: {
    greeting: 'Hello! How can we help you today?',
    order_confirmed: 'Your order is confirmed. Thank you!',
    price_label: 'Price',
    out_of_stock: 'Out of stock',
    payment_received: 'Payment received and verified.',
    follow_up: 'Just following up on your recent enquiry.',
    opt_out_note: 'Reply STOP to unsubscribe.'
  },
  ur: {
    greeting: 'Assalam o alaikum! Hum aap ki kaise madad kar saktay hain?',
    order_confirmed: 'Aap ka order confirm ho gaya hai. Shukriya!',
    price_label: 'Qeemat',
    out_of_stock: 'Stock mein nahi hai',
    payment_received: 'Payment mil gayi aur verify ho gayi.',
    follow_up: 'Aap ki recent inquiry ke baare mein follow-up.',
    opt_out_note: 'Band karne ke liye STOP likhein.'
  },
  ar: {
    greeting: 'مرحبا! كيف يمكننا مساعدتك اليوم؟',
    order_confirmed: 'تم تأكيد طلبك. شكرا لك!',
    price_label: 'السعر',
    out_of_stock: 'غير متوفر',
    payment_received: 'تم استلام الدفعة والتحقق منها.',
    follow_up: 'متابعة بخصوص استفسارك الأخير.',
    opt_out_note: 'أرسل STOP لإلغاء الاشتراك.'
  },
  hi: {
    greeting: 'नमस्ते! हम आपकी कैसे मदद कर सकते हैं?',
    order_confirmed: 'आपका ऑर्डर कन्फर्म हो गया है। धन्यवाद!',
    price_label: 'कीमत',
    out_of_stock: 'स्टॉक में नहीं है',
    payment_received: 'भुगतान प्राप्त और सत्यापित हो गया।',
    follow_up: 'आपकी हाल की पूछताछ के बारे में फ़ॉलो-अप।',
    opt_out_note: 'अनसब्सक्राइब करने के लिए STOP भेजें।'
  }
};
function locales() { return Object.keys(CATALOG); }
function t(key, locale) {
  const loc = String(locale || 'en').toLowerCase();
  if (CATALOG[loc] && CATALOG[loc][key] != null) return CATALOG[loc][key];
  if (CATALOG.en[key] != null) return CATALOG.en[key];
  return key;
}
function pack(locale) { return Object.assign({}, CATALOG.en, CATALOG[String(locale || 'en').toLowerCase()] || {}); }
module.exports = { t, pack, locales, CATALOG };
