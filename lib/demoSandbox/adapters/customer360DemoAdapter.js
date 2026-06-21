'use strict';
const { demoSlice } = require('./_base');
module.exports = { preview: (scenarioId) => demoSlice('customers', scenarioId) };
