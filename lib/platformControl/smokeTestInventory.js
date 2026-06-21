// lib/platformControl/smokeTestInventory.js — smoke test files inventory.
  'use strict';
  const cfg = require('./config');
  const { maskPath } = require('./redactor');


  function smokeTestInventory() {
      const files = cfg.walk('tests', { exts: ['.js'] }).filter((f) => /smoke/i.test(f));
      return cfg.base({ smokeTestsPreview: files.map((f) => ({ path: maskPath(f) })), smokeTestsDetectedPreview: files.length
  });
  }


  module.exports = { smokeTestInventory };
