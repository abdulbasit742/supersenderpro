'use strict';
/** Demo invitation + walkthrough script drafts. Links point to demo sandbox / funnel. */
function get(language) {
  const lang = language === 'roman_urdu' ? 'roman_urdu' : 'en';
  const en = {
    invite: 'I would love to show you SuperSender Pro. Here is a safe demo (fake data, nothing live): /demo-sandbox.html',
    walkthrough: ['Open the demo dashboard', 'Start the AI Tools Reseller scenario', 'Run the guided tour', 'Show Owner Command + KPIs'],
  };
  const ur = {
    invite: 'Main aapko SuperSender Pro dikhana chahta hoon. Yeh safe demo hai (fake data, kuch live nahi): /demo-sandbox.html',
    walkthrough: ['Demo dashboard kholein', 'AI Tools Reseller scenario start karein', 'Guided tour chalayein', 'Owner Command + KPIs dikhayein'],
  };
  return lang === 'roman_urdu' ? ur : en;
}
module.exports = { get };
