// adsConfig.js – loads ads platform credentials from environment variables or optional JSON file

const fs = require('fs');
const path = require('path');

function loadJsonConfig() {
  const jsonPath = path.resolve(__dirname, '../config/adsCredentials.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const data = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse adsCredentials.json:', e.message);
    }
  }
  return {};
}

const jsonConfig = loadJsonConfig();

function getEnv(key, fallback) {
  return process.env[key] || jsonConfig[key] || fallback;
}

module.exports = {
  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET'),
  GOOGLE_REFRESH_TOKEN: getEnv('GOOGLE_REFRESH_TOKEN'),
  FB_APP_ID: getEnv('FB_APP_ID'),
  FB_APP_SECRET: getEnv('FB_APP_SECRET'),
  FB_ACCESS_TOKEN: getEnv('FB_ACCESS_TOKEN'),
  // Add more credentials as needed
};
