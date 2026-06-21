'use strict';
/** PII-masked JSON storage for leads. No raw email/phone stored. App runs if file missing. */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const LEADS_PATH = process.env.PUBLIC_FUNNEL_LEADS_PATH || 'data/public-funnel-leads.json';
const abs = (p) => path.isAbsolute(p) ? p : path.join(ROOT, p);
function maskEmail(v) { return v ? String(v).replace(/([a-z0-9._%+-])[a-z0-9._%+-]*@([a-z0-9])[a-z0-9.-]*\.([a-z]{2,})/gi, '$1***@$2***.$3') : v; }
function maskPhone(v) { if (!v) return v; const d = String(v).replace(/\D/g, ''); return d.length < 4 ? '****' : '****' +
d.slice(-4); }
function read() { try { return JSON.parse(fs.readFileSync(abs(LEADS_PATH), 'utf8')); } catch { return []; } }
function write(list) { try { fs.mkdirSync(path.dirname(abs(LEADS_PATH)), { recursive: true }); } catch {}
fs.writeFileSync(abs(LEADS_PATH), JSON.stringify(list, null, 2), 'utf8'); }
function addLead(input) {
  const list = read();
  const lead = {
    id: 'lead_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nameSafe: input.name ? String(input.name).trim().slice(0, 40) : '',
    emailMasked: maskEmail(input.email || ''), phoneMasked: maskPhone(input.phone || ''),
    businessType: input.businessType || null, planInterest: input.planInterest || null,
    source: input.source || 'landing', intent: input.intent || 'contact',
    consent: input.consent === true, createdAt: new Date().toISOString(), dryRun: true,
  };
  list.push(lead); write(list);
  return lead;
}
function listLeads(limit = 200) { return read().slice(-limit).reverse(); }
module.exports = { addLead, listLeads, maskEmail, maskPhone, LEADS_PATH };
