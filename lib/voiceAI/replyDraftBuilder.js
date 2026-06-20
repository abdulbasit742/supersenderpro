// lib/voiceAI/replyDraftBuilder.js — Drafts a suggested text reply for a voice conversation.
// Rule/template based by default. Output is text only — no auto-send, no voice generation.

const tonePresets = require('./businessTonePresets');

const REPLIES = {
  order: {
    roman_urdu: 'Shukria! Aap ka order note kar liya hai. Hum jald confirm karte hain — koi aur detail chahiye?',
    english: 'Thank you! We have noted your order. We will confirm shortly — anything else you need?',
    urdu: 'شکریہ! آپ کا آرڈر نوٹ کر لیا ہے۔ ہم جلد تصدیق کرتے ہیں۔',
  },
  payment: {
    roman_urdu: 'Aap ki payment ke baare mein — main details bhej deta hoon. Koi pareshani ho to batayein.',
    english: 'Regarding your payment — I will share the details. Let me know if you face any issue.',
    urdu: 'آپ کی ادائیگی کے بارے میں تفصیلات بھیج رہا ہوں۔',
  },
  support: {
    roman_urdu: 'Maazrat masle ke liye. Hum is ko abhi check karte hain aur jald solution dete hain.',
    english: 'Sorry for the trouble. We are checking this now and will get you a solution soon.',
    urdu: 'مسئلے کے لیے معذرت۔ ہم ابھی چیک کر رہے ہیں۔',
  },
  complaint: {
    roman_urdu: 'Bohat maazrat. Aap ki shikayat note kar li hai aur priority par hal karenge.',
    english: 'We are very sorry. Your complaint is noted and we will resolve it on priority.',
    urdu: 'بہت معذرت۔ آپ کی شکایت نوٹ کر لی ہے۔',
  },
  delivery: {
    roman_urdu: 'Aap ki delivery ka status check kar ke abhi update deta hoon.',
    english: 'Let me check your delivery status and update you right away.',
    urdu: 'آپ کی ڈیلیوری کا اسٹیٹس چیک کر کے اپڈیٹ دیتا ہوں۔',
  },
  pricing: {
    roman_urdu: 'Price details bhej raha hoon. Aaj kuch deals bhi available hain.',
    english: 'Sending you the price details. We also have some deals available today.',
    urdu: 'قیمت کی تفصیلات بھیج رہا ہوں۔',
  },
  greeting: {
    roman_urdu: 'Assalam o Alaikum! Kaise madad kar sakte hain?',
    english: 'Hello! How can we help you today?',
    urdu: 'السلام علیکم! ہم آپ کی کیسے مدد کر سکتے ہیں؟',
  },
  general: {
    roman_urdu: 'Shukria message ke liye. Hum jald reply karte hain.',
    english: 'Thanks for your message. We will reply shortly.',
    urdu: 'پیغام کے لیے شکریہ۔ ہم جلد جواب دیں گے۔',
  },
};

function draft({ intent = 'general', language = 'roman_urdu', tone = 'professional' } = {}) {
  const byIntent = REPLIES[intent] || REPLIES.general;
  const text = byIntent[language] || byIntent.roman_urdu;
  return {
    suggestedReplyText: text,
    language,
    tone,
    toneStyle: (tonePresets[tone] || tonePresets.professional).style,
    autoSend: false,
    approvalRequired: true,
  };
}

module.exports = { draft, REPLIES };
