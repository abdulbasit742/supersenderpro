const fs = require('fs'), path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/landing_pages.json');
function load() { try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { pages: [] }; } catch { return { pages: [] }; } }
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function createLandingPage(storeId, title, htmlContent) {
  const data = load();
  const page = {
    id: `LP-${Date.now()}`,
    storeId,
    title,
    htmlContent,
    createdAt: new Date().toISOString()
  };
  data.pages.push(page);
  save(data);
  return page;
}

module.exports = { createLandingPage };
