const fs = require('fs'), path = require('path');
const DATA = path.join(__dirname, '../../../data');

class AgentMemory {
  constructor(agentId) {
    this.agentId = agentId;
    this.shortTerm = [];
    this.file = path.join(DATA, 'agent_memory_' + agentId + '.json');
    this.longTerm = this._load();
  }
  _load() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch(e) { return { facts: [], lastActive: null }; } }
  _save() { fs.writeFileSync(this.file, JSON.stringify(this.longTerm, null, 2)); }
  remember(role, content) {
    this.shortTerm.push({ role, content, ts: new Date().toISOString() });
    if (this.shortTerm.length > 20) this.shortTerm.shift();
  }
  memorize(key, value) {
    this.longTerm.facts = this.longTerm.facts || [];
    const existing = this.longTerm.facts.findIndex(function(f) { return f.key === key; });
    const entry = { key, value, updatedAt: new Date().toISOString() };
    if (existing >= 0) this.longTerm.facts[existing] = entry;
    else this.longTerm.facts.push(entry);
    this.longTerm.lastActive = new Date().toISOString();
    this._save();
  }
  recall(key) {
    const fact = (this.longTerm.facts || []).find(function(f) { return f.key === key; });
    return fact ? fact.value : null;
  }
  search(query) {
    const q = query.toLowerCase();
    return (this.longTerm.facts || []).filter(function(f) { return String(f.key).toLowerCase().includes(q) || String(f.value).toLowerCase().includes(q); });
  }
  getContext(maxItems) {
    maxItems = maxItems || 10;
    const facts = (this.longTerm.facts || []).slice(-maxItems).map(function(f) { return f.key + ': ' + f.value; });
    const short = this.shortTerm.slice(-10).map(function(m) { return m.role + ': ' + m.content; });
    const NL = String.fromCharCode(10);
    const longTerm = facts.join('; ');
    const shortTerm = short.join(NL);
    return { shortTerm, longTerm, combined: [longTerm, shortTerm].filter(Boolean).join(NL + NL) };
  }
  clearShortTerm() { this.shortTerm = []; }
  dump() { return { agentId: this.agentId, shortTerm: this.shortTerm, longTerm: this.longTerm }; }
}

const memoryRegistry = {};
function getMemory(agentId) {
  if (!memoryRegistry[agentId]) memoryRegistry[agentId] = new AgentMemory(agentId);
  return memoryRegistry[agentId];
}

module.exports = { AgentMemory, getMemory };