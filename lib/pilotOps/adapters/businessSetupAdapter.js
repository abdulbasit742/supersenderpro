 'use strict';
 const b = require('./_base');
 function setup() {
   if (!b.anyExists(['src/modules/businessSetup', 'lib/businessSetup', 'public/business-setup.html'])) return
 b.unavailable('Business Setup Wizard');
     return b.ok('Business setup wizard present', { presetsAvailable: true });
 }
 module.exports = { setup, health: setup };
