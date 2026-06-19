const fs = require('fs'), path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/marketing_audience.json');
function load() { try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { audiences: [] }; } catch { return { audiences: [] }; } }
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function createAudience(name, description) {
  const data = load();
  const aud = { id: `AUD-${Date.now()}`, name, description, contacts: [] };
  data.audiences.push(aud);
  save(data);
  return aud;
}

function addContactToAudience(audienceId, contact) {
  const data = load();
  const aud = data.audiences.find(a => a.id === audienceId);
  if (!aud) return null;
  if (!aud.contacts.some(c => c.phone === contact.phone)) {
    aud.contacts.push(contact);
    save(data);
  }
  return aud;
}

module.exports = { createAudience, addContactToAudience };
