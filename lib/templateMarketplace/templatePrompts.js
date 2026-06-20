// lib/templateMarketplace/templatePrompts.js — Rule-based prompt scaffolds for the draft generator.
// Used to build drafts WITHOUT calling external AI unless explicitly enabled elsewhere.
'use strict';
module.exports={
  template:(industry)=>`Create a SuperSender Pro business blueprint for "${industry}". Include modules, setup checklist, sample recipes, compliance notes. Keep it demo-safe.`,
  recipe:(goal)=>`Design a dry-run automation recipe for: "${goal}". Output draft actions only; no live send/payment.`,
  playbook:(topic)=>`Outline a playbook for "${topic}" with ordered steps, owners, and checkpoints.`,
  campaign:(offer)=>`Draft a WhatsApp/channel campaign for "${offer}". Draft-only, no live send.`,
  support_article:(question)=>`Write a help-center article answering: "${question}". Friendly, concise.`,
  owner_checklist:(area)=>`List an owner daily checklist for "${area}". 5-8 actionable items.`,
};
