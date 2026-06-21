'use strict';


/**
* Pilot Ops — follow-up message templates in English / Roman Urdu / mixed.
* Plain string templates with {placeholders}. No PII baked in; caller passes
* already-safe values (e.g. business name, masked nothing private).
*/

const TEMPLATES = {
 demo_confirmation: {
   english: 'Hi {name}, your SuperSender demo for {business} is confirmed. See you then!',
     roman_urdu: 'Salam {name}, {business} ke liye aap ka SuperSender demo confirm ho gaya hai. Milte hain!',
     mixed: 'Hi {name}, {business} ka demo confirm hai. See you soon!'
 },
 trial_approved: {
     english: 'Good news {name}: your {business} trial is approved. Let us set you up.',
     roman_urdu: 'Khushkhabri {name}: {business} ka trial approve ho gaya. Chalein setup karte hain.',
     mixed: 'Good news {name}, {business} trial approved. Setup shuru karein?'
 },
 setup_reminder: {
   english: 'Hi {name}, a few setup steps are pending for {business}. Can we finish them today?',
     roman_urdu: 'Salam {name}, {business} ke kuch setup steps baaki hain. Aaj complete karein?',
     mixed: 'Hi {name}, {business} ke setup steps pending hain. Aaj karte hain?'
 },
 missing_info_reminder: {
     english: 'Hi {name}, we need a bit more info to continue {business} setup.',
     roman_urdu: 'Salam {name}, {business} setup jari rakhne ke liye thori si info chahiye.',
     mixed: 'Hi {name}, {business} ke liye thori info chahiye to continue.'
 },
 checklist_reminder: {
   english: 'Hi {name}, your onboarding checklist for {business} is {percent}% done. Shall we wrap it up?',
     roman_urdu: 'Salam {name}, {business} ka onboarding {percent}% mukammal hai. Baaki complete karein?',
     mixed: 'Hi {name}, {business} onboarding {percent}% done. Finish karein?'
 },
 trial_expiring: {
     english: 'Hi {name}, your {business} trial expires in {days} days. Want to continue?',
     roman_urdu: 'Salam {name}, {business} ka trial {days} din mein khatam ho raha hai. Continue karna chahenge?',
     mixed: 'Hi {name}, {business} trial {days} din mein expire. Continue?'
 },
 upgrade_recommendation: {
   english: 'Hi {name}, {business} is doing great on the pilot. The {plan} plan fits you best.',
     roman_urdu: 'Salam {name}, {business} pilot par bohat acha chal raha hai. Aap ke liye {plan} plan best hai.',
     mixed: 'Hi {name}, {business} pilot strong hai. {plan} plan recommend karta hoon.'
 },
 feedback_request: {
     english: 'Hi {name}, how is {business} finding SuperSender so far? Any feedback helps.',
     roman_urdu: 'Salam {name}, {business} ko SuperSender kaisa lag raha hai? Aap ki feedback qeemti hai.',

       mixed: 'Hi {name}, {business} ka experience kaisa hai? Feedback dein?'
     },
     bug_resolved: {
       english: 'Hi {name}, the issue you reported for {business} is fixed. Thanks for flagging it!',
       roman_urdu: 'Salam {name}, {business} ka jo issue tha woh fix ho gaya hai. Report karne ka shukria!',
       mixed: 'Hi {name}, {business} ka issue fix ho gaya. Thanks for reporting!'
     },
     thank_you_success: {
       english: 'Thank you {name}! {business} hit its pilot goals. Excited to grow with you.',
       roman_urdu: 'Shukria {name}! {business} ne pilot goals achieve kiye. Aap ke saath grow karne ka intezar hai.',
       mixed: 'Thank you {name}! {business} ne goals achieve kiye. Let us grow together!'
     },
     cancellation_save: {
       english: 'Hi {name}, sorry {business} is thinking of leaving. Can we fix what is not working?',
       roman_urdu: 'Salam {name}, afsos {business} jaane ka soch raha hai. Jo theek nahi woh fix karein?',
       mixed: 'Hi {name}, {business} ruk jaye? Jo issue hai woh fix karte hain.'
     },
};


module.exports = { TEMPLATES };
