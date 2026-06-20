// developerPortal/adapters/_baseAdapter.js — base for safe source-module adapters.
// Adapters DETECT a source module, expose available events, and build REDACTED payload previews.
// They never call external APIs, never mutate the source module, and never expose secrets/full PII.
const fs = require('fs');
const path = require('path');
const { build } = require('../webhookPayloadBuilder');

function moduleExists(relPaths){
  return relPaths.some(rel => { try { return fs.existsSync(path.join(__dirname, '../../../', rel)); } catch { return false; } });
}

function makeAdapter({ name, detectFiles = [], events = [] }){
  return {
    name,
    isAvailable(){ return detectFiles.length === 0 ? false : moduleExists(detectFiles); },
    availableEvents(){ return this.isAvailable() ? events : []; },
    buildPreview(eventType, overrides = {}){
      if (!events.includes(eventType)) return { available:false, reason:`event ${eventType} not provided by ${name}` };
      return { available: this.isAvailable(), source:name, preview: build(eventType, overrides) };
    },
    status(){ return { name, available:this.isAvailable(), events: this.availableEvents() }; }
  };
}
module.exports = { makeAdapter, moduleExists };
