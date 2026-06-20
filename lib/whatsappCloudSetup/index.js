// lib/whatsappCloudSetup/index.js — Barrel for the WhatsApp Cloud Setup coordination layer.
'use strict';

const safety = require('./safety');
const redactor = require('./redactor');
const configModel = require('./configModel');
const store = require('./store');
const checklist = require('./setupChecklist');
const validator = require('./setupValidator');
const readiness = require('./readinessScoring');
const wizard = require('./setupWizard');
const webhookVerifier = require('./webhookVerifier');
const sendPreview = require('./sendPreview');

module.exports = {
  safety,
  redactor,
  configModel,
  store,
  checklist,
  validator,
  readiness,
  wizard,
  webhookVerifier,
  sendPreview,
  flags: safety.flags,
};
