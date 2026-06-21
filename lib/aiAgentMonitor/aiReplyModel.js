'use strict';
/**
* aiReplyModel.js — AI reply shape, enums, factory, and synthetic seed data.
   * Pure data + helpers; no I/O. No real customer data.
   */
const crypto = require('crypto');

const STATUSES = ['preview', 'approved', 'needs_review', 'escalated', 'rejected', 'archived'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const CHANNELS = ['whatsapp', 'email', 'sms', 'webchat'];

function maskName(name) { const s = String(name || ''); return s ? s[0] + '***' : 'Customer'; }
function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }


function newReply(input) {
    const now = new Date().toISOString();
    const i = input || {};
    return {
      id: i.id || 'rep_' + crypto.randomBytes(5).toString('hex'),
      conversationId: i.conversationId || 'conv_' + crypto.randomBytes(4).toString('hex'),
      channel: CHANNELS.includes(i.channel) ? i.channel : 'whatsapp',
      customerNameSafe: maskName(i.customerName),
      phoneMasked: maskPhone(i.phone),
      userMessagePreview: String(i.userMessage || '').slice(0, 200),
      aiReplyPreview: String(i.aiReply || '').slice(0, 400),
      confidenceScore: typeof i.confidenceScore === 'number' ? i.confidenceScore : 0,
      riskLevel: RISK_LEVELS.includes(i.riskLevel) ? i.riskLevel : 'low',
      qualityScore: typeof i.qualityScore === 'number' ? i.qualityScore : 0,
      handoffRequired: !!i.handoffRequired,
      status: STATUSES.includes(i.status) ? i.status : 'preview',
      createdAt: i.createdAt || now,
      updatedAt: now,
    };
}

// Synthetic samples to exercise the monitor. No real customers.
function seeds() {
    return [
      newReply({ id: 'rep_seed1', channel: 'whatsapp', customerName: 'Ayesha', phone: '+923001112233', userMessage: 'price kya hai chatgpt plus ka?', aiReply: 'ChatGPT Plus is PKR 5,500/month. Want me to set it up?', confidenceScore: 0.86,
qualityScore: 0.9, riskLevel: 'low', status: 'preview' }),
   newReply({ id: 'rep_seed2', channel: 'whatsapp', customerName: 'Bilal', phone: '+923004445566', userMessage: 'mera payment fail ho gaya refund chahiye', aiReply: 'I can probably refund that right now, no problem at all.',
confidenceScore: 0.42, qualityScore: 0.5, riskLevel: 'high', handoffRequired: true, status: 'needs_review' }),
   newReply({ id: 'rep_seed3', channel: 'email', customerName: 'Sara', phone: '', userMessage: 'Is this legal to use in my country?', aiReply: 'Yes it is completely legal everywhere, guaranteed.', confidenceScore: 0.30, qualityScore: 0.35,
riskLevel: 'critical', handoffRequired: true, status: 'escalated' }),
   newReply({ id: 'rep_seed4', channel: 'sms', customerName: 'Omar', phone: '+923007778899', userMessage: 'thanks!',
aiReply: 'You are welcome! Reach out anytime.', confidenceScore: 0.95, qualityScore: 0.96, riskLevel: 'low', status:
'approved' }),
 ];
}

module.exports = { STATUSES, RISK_LEVELS, CHANNELS, newReply, seeds, maskName, maskPhone };
