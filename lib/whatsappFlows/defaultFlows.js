 'use strict';
 /**
  * defaultFlows.js — seeded sample flows: order, booking, lead capture, survey.
  * All preview-ready, consent-required, dry-run. No real data.
  */
 const model = require('./flowModel');


 function seeds() {
   return [
     model.newFlow({ id: 'flow_order', name: 'Place an Order', category: 'order', status: 'preview_ready', screens: [
        { id: 'PRODUCT', title: 'Choose product', nextScreenId: 'DETAILS', layout: [
          { type: 'TextHeading', text: 'What would you like to order?' },
         { name: 'product', type: 'Dropdown', label: 'Product', required: true, options: [{ id: 'wa_pro_1m', title:
 'WhatsApp Pro 1 Month' }, { id: 'ai_tool_yr', title: 'AI Tool Yearly' }] },
          { name: 'quantity', type: 'TextInput', inputType: 'number', label: 'Quantity', required: true },
          { type: 'Footer', text: 'Continue' },
        ] },
        { id: 'DETAILS', title: 'Your details', nextScreenId: 'CONFIRM', layout: [
          { name: 'full_name', type: 'TextInput', inputType: 'text', label: 'Full name', required: true },
          { name: 'phone', type: 'TextInput', inputType: 'phone', label: 'Phone', required: true },
          { name: 'address', type: 'TextArea', label: 'Delivery address', required: true },
          { type: 'Footer', text: 'Continue' },
        ] },
        { id: 'CONFIRM', title: 'Confirm', terminal: true, layout: [
          { type: 'TextBody', text: 'Review and submit your order.' },
          { name: 'consent', type: 'OptIn', label: 'I agree to be contacted about this order', required: true },
          { type: 'Footer', text: 'Submit order' },
        ] },
     ] }),
     model.newFlow({ id: 'flow_booking', name: 'Book an Appointment', category: 'booking', status: 'preview_ready',
 screens: [
       { id: 'SLOT', title: 'Pick a slot', nextScreenId: 'CONTACT', layout: [
         { name: 'service', type: 'RadioButtonsGroup', label: 'Service', required: true, options: [{ id: 'setup', title:
 'Account setup' }, { id: 'support', title: 'Support session' }] },

         { name: 'date', type: 'DatePicker', label: 'Preferred date', required: true },
         { type: 'Footer', text: 'Continue' },
       ] },
       { id: 'CONTACT', title: 'Contact', terminal: true, layout: [
         { name: 'name', type: 'TextInput', inputType: 'text', label: 'Name', required: true },
         { name: 'email', type: 'TextInput', inputType: 'email', label: 'Email', required: false },
         { name: 'consent', type: 'OptIn', label: 'Confirm booking request', required: true },
         { type: 'Footer', text: 'Request booking' },
       ] },
    ] }),
    model.newFlow({ id: 'flow_lead', name: 'Lead Capture', category: 'lead_capture', status: 'preview_ready', screens: [
       { id: 'LEAD', title: 'Tell us about you', terminal: true, layout: [
         { type: 'TextHeading', text: 'Get a quote' },
         { name: 'name', type: 'TextInput', inputType: 'text', label: 'Name', required: true },
         { name: 'phone', type: 'TextInput', inputType: 'phone', label: 'WhatsApp number', required: true },
      { name: 'interest', type: 'Dropdown', label: 'Interested in', required: true, options: [{ id: 'ai', title: 'AI tools' }, { id: 'reseller', title: 'Reseller plan' }] },
         { name: 'consent', type: 'OptIn', label: 'I agree to be contacted', required: true },
         { type: 'Footer', text: 'Submit' },
      ] },
    ] }),
    model.newFlow({ id: 'flow_survey', name: 'Feedback Survey', category: 'survey', status: 'preview_ready', screens: [
      { id: 'SURVEY', title: 'Quick feedback', terminal: true, layout: [
      { name: 'rating', type: 'RadioButtonsGroup', label: 'How was your experience?', required: true, options: [{ id:
'5', title: 'Excellent' }, { id: '3', title: 'Okay' }, { id: '1', title: 'Poor' }] },
         { name: 'comments', type: 'TextArea', label: 'Comments', required: false },
         { type: 'Footer', text: 'Send feedback' },
      ] },
    ] }),
  ];
}
module.exports = { seeds };
