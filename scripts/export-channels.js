const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const settingsPath = path.join(DATA_DIR, 'settings.json');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

const CHANNEL_KEYS = [
  'whatsapp_channel_ids',
  'whatsapp_channel_source_ids',
  'whatsapp_channel_source_routes',
  'whatsapp_channel_source_links',
  'whatsapp_channel_source_whitelist',
  'whatsapp_channel_source_blacklist',
  'whatsapp_channel_source_priority',
  'whatsapp_channel_source_categories',
  'whatsapp_channel_source_rules',
  'whatsapp_channel_paused_sources',
  'whatsapp_channel_copy_enabled',
  'whatsapp_channel_copy_footer',
  'whatsapp_channel_auto_source_all_followed',
  'whatsapp_channel_source_cooldown_seconds',
  'whatsapp_channel_duplicate_window_hours',
  'whatsapp_channel_max_pending_per_source'
];

function printUsage() {
  console.log(`${BOLD}${CYAN}SuperSender Pro - Channel Settings Export/Import Tool${RESET}`);
  console.log(`=======================================================`);
  console.log(`Usage:`);
  console.log(`  Export settings:  ${BOLD}node scripts/export-channels.js export [output_file.json]${RESET}`);
  console.log(`  Import settings:  ${BOLD}node scripts/export-channels.js import <input_file.json>${RESET}\n`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || (command !== 'export' && command !== 'import')) {
  printUsage();
  process.exit(0);
}

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (command === 'export') {
  // 1. Export
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
    } catch (e) {
      console.error(`${RED}Error parsing current settings.json: ${e.message}${RESET}`);
    }
  } else {
    console.log(`${YELLOW}No settings.json found in data directory. Exporting empty/default structure.${RESET}`);
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    channelSettings: {}
  };

  CHANNEL_KEYS.forEach(key => {
    if (settings[key] !== undefined) {
      exportData.channelSettings[key] = settings[key];
    }
  });

  const defaultFilename = `channel_settings_export_${Date.now()}.json`;
  const exportFile = args[1] ? path.resolve(args[1]) : path.join(ROOT, defaultFilename);

  try {
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(`${GREEN}${BOLD}✔ Successfully exported channel settings!${RESET}`);
    console.log(`Export file saved at: ${BOLD}${CYAN}${exportFile}${RESET}`);
    console.log(`Exported keys: ${CYAN}${Object.keys(exportData.channelSettings).length}${RESET} keys found.\n`);
  } catch (error) {
    console.error(`${RED}✘ Failed to export settings: ${error.message}${RESET}`);
    process.exit(1);
  }

} else if (command === 'import') {
  // 2. Import
  const importFile = args[1];
  if (!importFile) {
    console.error(`${RED}✘ Error: Please specify the input JSON file to import.${RESET}`);
    console.log(`Usage: node scripts/export-channels.js import <input_file.json>\n`);
    process.exit(1);
  }

  const importFilePath = path.resolve(importFile);
  if (!fs.existsSync(importFilePath)) {
    console.error(`${RED}✘ Error: File not found at ${importFilePath}${RESET}`);
    process.exit(1);
  }

  let importData;
  try {
    importData = JSON.parse(fs.readFileSync(importFilePath, 'utf8'));
  } catch (e) {
    console.error(`${RED}✘ Error: Failed to parse input file as JSON: ${e.message}${RESET}`);
    process.exit(1);
  }

  if (!importData || !importData.channelSettings) {
    console.error(`${RED}✘ Error: Invalid backup format. Missing 'channelSettings' property.${RESET}`);
    process.exit(1);
  }

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
    } catch (e) {
      console.warn(`${YELLOW}Warning: Current settings.json exists but is invalid. Overwriting with imported data.${RESET}`);
    }
  }

  // Backup current settings before merging
  if (Object.keys(settings).length > 0) {
    const backupPath = `${settingsPath}.backup_before_import_${Date.now()}`;
    fs.writeFileSync(backupPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`${YELLOW}Created safety backup of current settings at: ${backupPath}${RESET}`);
  }

  // Merge channel keys
  const importedKeys = Object.keys(importData.channelSettings);
  importedKeys.forEach(key => {
    settings[key] = importData.channelSettings[key];
  });

  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`${GREEN}${BOLD}✔ Successfully imported channel settings!${RESET}`);
    console.log(`Merged ${BOLD}${CYAN}${importedKeys.length}${RESET} channel settings keys into settings.json.`);
    console.log(`Keys imported: ${CYAN}${importedKeys.join(', ')}${RESET}\n`);
  } catch (error) {
    console.error(`${RED}✘ Failed to write to settings.json during import: ${error.message}${RESET}`);
    process.exit(1);
  }
}
