const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

function readJsonFile(name) {
  const safe = path.basename(name);
  const file = path.join(DATA_DIR, safe);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch {}
  return [];
}

function normalizeSearchText(row) {
  if (!row) return '';
  if (typeof row === 'string') return row.toLowerCase();
  try {
    return JSON.stringify(row).toLowerCase();
  } catch {
    return '';
  }
}

const definitions = [
  {
    name: 'search_business_data',
    description: 'Search local JSON business data such as customers, orders, inbox, alerts, social posts.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term/keyword' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional JSON files. Defaults to customers, orders, inbox, alerts, social_posts.'
        },
        limit: { type: 'number', description: 'Max matches to return (default 50)' }
      },
      required: ['query']
    }
  },
  {
    name: 'read_data_file',
    description: 'Read a safe JSON data file from the project data folder.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Filename, e.g. customers.json, orders.json, inbox.json, settings.json' },
        limit: { type: 'number', description: 'Max rows to return' }
      },
      required: ['file']
    }
  }
];

const handlers = {
  search_business_data: async (a) => {
    const files = Array.isArray(a.files) && a.files.length
      ? a.files
      : ['customers.json', 'orders.json', 'inbox.json', 'alerts.json', 'social_posts.json'];
    const q = String(a.query || '').toLowerCase();
    const matches = [];
    const limit = a.limit || 50;

    for (const file of files) {
      const rows = readJsonFile(file);
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        if (normalizeSearchText(row).includes(q)) {
          matches.push({ file: path.basename(file), row });
        }
        if (matches.length >= limit) break;
      }
      if (matches.length >= limit) break;
    }
    return matches;
  },
  read_data_file: async (a) => {
    const rows = readJsonFile(a.file);
    const limit = a.limit || 50;
    if (Array.isArray(rows)) {
      return rows.slice(0, limit);
    }
    return rows;
  }
};

module.exports = { definitions, handlers };
