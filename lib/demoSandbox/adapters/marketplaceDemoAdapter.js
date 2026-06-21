'use strict';
const factory = require('../demoDataFactory');
module.exports = { preview: () => ({ demo: true, dryRun: true, marketplace: factory.marketplace() }) };
