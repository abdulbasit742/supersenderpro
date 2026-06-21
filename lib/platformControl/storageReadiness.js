// lib/platformControl/storageReadiness.js — data folders + JSON stores (existence-only).
 'use strict';
 const cfg = require('./config');
 const { maskPath } = require('./redactor');

  function storageReadiness() {
       const dataFoldersPreview = ['data', 'storage', 'uploads', 'tmp'].filter((d) => cfg.exists(d));
       const jsonStoresPreview = cfg.walk('data', { exts: ['.json'], maxDepth: 3 }).slice(0, 50).map(maskPath);
       return cfg.base({
         dataFoldersPreview,
         jsonStoresPreview,
         writableAssumptionPreview: true,
         note: 'existence-only scan; no files read or written',
       });
  }


  module.exports = { storageReadiness };
