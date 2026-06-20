// lib/groupCommerce/store.js - Persistence & Data Masking for Group Commerce OS
const fs = require('fs');
const path = require('path');

const STORE_PATH = process.env.GROUP_COMMERCE_STORE_PATH || 'data/group-commerce.json';
const HISTORY_PATH = process.env.GROUP_COMMERCE_HISTORY_PATH || 'data/group-commerce-history.json';

// Helper to ensure directories exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Phone number masking helper (e.g. +92300*****12)
function maskPhoneNumber(phone) {
  if (!phone) return '';
  const clean = String(phone).trim();
  if (clean.length <= 4) return '****';
  return clean.slice(0, 4) + '*****' + clean.slice(-2);
}

// Email masking helper (e.g. j***@domain.com)
function maskEmail(email) {
  if (!email) return '';
  const clean = String(email).trim();
  const parts = clean.split('@');
  if (parts.length !== 2) return '*****';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 1) return '*@' + domain;
  return name[0] + '***' + '@' + domain;
}

// General masking helper for billing, payments or raw inputs
function maskSensitiveInfo(text) {
  if (!text) return '';
  let masked = text;
  // Mask potential phone numbers (e.g., 10-12 digit numbers)
  masked = masked.replace(/(\+?\d{4})\d{5,8}(\d{2})/g, '$1*****$2');
  // Mask potential emails
  masked = masked.replace(/([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g, (match, p1, p2, p3) => {
    return p1[0] + '***@' + p2 + '.' + p3;
  });
  return masked;
}

function readRegistry() {
  const fullPath = path.resolve(STORE_PATH);
  ensureDirectoryExistence(fullPath);
  if (!fs.existsSync(fullPath)) {
    // Return sample/mock group configurations by default
    return {
      groups: [
        {
          groupId: "group-123",
          groupName: "Wholesale Electronics Pakistan",
          platform: "whatsapp",
          linkedTenantId: "tenant-abc",
          linkedEcommerceStoreId: "store-456",
          linkedCatalogId: "cat-789",
          adminNumbers: [maskPhoneNumber("+923001234567"), maskPhoneNumber("+923129876543")],
          allowedCommands: ["help", "status", "catalog", "products", "stock", "price", "sellers", "rules", "pause", "resume"],
          moderationMode: true,
          commerceMode: true,
          aiAgentMode: true,
          relaySettings: { enabled: true, channels: ["chan-abc"] },
          pauseSettings: { isPaused: false, pauseUntil: null },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          groupId: "group-456",
          groupName: "Tech Resellers Hub",
          platform: "whatsapp",
          linkedTenantId: "tenant-xyz",
          linkedEcommerceStoreId: null,
          linkedCatalogId: "cat-000",
          adminNumbers: [maskPhoneNumber("+923214567890")],
          allowedCommands: ["help", "status", "catalog", "products"],
          moderationMode: false,
          commerceMode: true,
          aiAgentMode: false,
          relaySettings: { enabled: false, channels: [] },
          pauseSettings: { isPaused: false, pauseUntil: null },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
  }
  try {
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to read group-commerce store:", e);
    return { groups: [] };
  }
}

function writeRegistry(data) {
  const fullPath = path.resolve(STORE_PATH);
  ensureDirectoryExistence(fullPath);
  try {
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Failed to write group-commerce store:", e);
    return false;
  }
}

function readHistory() {
  const fullPath = path.resolve(HISTORY_PATH);
  ensureDirectoryExistence(fullPath);
  if (!fs.existsSync(fullPath)) {
    return { history: [] };
  }
  try {
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to read group-commerce history:", e);
    return { history: [] };
  }
}

function addHistoryEntry(entry) {
  const historyData = readHistory();
  const safeEntry = {
    id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    groupId: entry.groupId,
    type: entry.type || 'message',
    message: maskSensitiveInfo(entry.message || ''),
    sender: maskPhoneNumber(entry.sender || ''),
    analyzed: entry.analyzed || null,
    actionTaken: entry.actionTaken || null,
    dryRun: entry.dryRun !== false
  };
  historyData.history.unshift(safeEntry);
  if (historyData.history.length > 200) {
    historyData.history = historyData.history.slice(0, 200);
  }
  const fullPath = path.resolve(HISTORY_PATH);
  ensureDirectoryExistence(fullPath);
  try {
    fs.writeFileSync(fullPath, JSON.stringify(historyData, null, 2), 'utf8');
    return safeEntry;
  } catch (e) {
    console.error("Failed to write group-commerce history:", e);
    return null;
  }
}

module.exports = {
  readRegistry,
  writeRegistry,
  readHistory,
  addHistoryEntry,
  maskPhoneNumber,
  maskEmail,
  maskSensitiveInfo
};
