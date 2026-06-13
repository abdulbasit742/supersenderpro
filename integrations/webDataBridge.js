const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const axios = require('axios');

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_BYTES = 750000;
const MAX_LOG_ROWS = 500;

function isPrivateIPv4(ip = '') {
  const parts = String(ip).split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIPv6(ip = '') {
  const value = String(ip).toLowerCase();
  return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:');
}

function isPrivateAddress(address = '') {
  return String(address).includes(':') ? isPrivateIPv6(address) : isPrivateIPv4(address);
}

function parseUrl(value = '') {
  let parsed;
  try {
    parsed = new URL(String(value || '').trim());
  } catch {
    throw new Error('Valid http/https URL required');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https URLs are allowed');
  }
  return parsed;
}

async function assertSafeUrl(value, allowPrivate = false) {
  const parsed = parseUrl(value);
  if (!allowPrivate) {
    const records = await dns.lookup(parsed.hostname, { all: true });
    const privateHit = records.find(row => isPrivateAddress(row.address));
    if (privateHit) throw new Error(`Private/local network target blocked: ${parsed.hostname}`);
  }
  return parsed.toString();
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pickTitle(html = '') {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 180) : '';
}

function pickDescription(html = '') {
  const meta = String(html).match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || String(html).match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
  return meta ? stripHtml(meta[1]).slice(0, 300) : '';
}

function pickLinks(html = '', baseUrl = '') {
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html))) && links.length < 50) {
    try {
      links.push({
        url: new URL(match[1], baseUrl).toString(),
        text: stripHtml(match[2]).slice(0, 140)
      });
    } catch {}
  }
  return links;
}

function extractBySelector(html = '', selector = '') {
  const wanted = String(selector || '').trim();
  if (!wanted) return '';
  if (wanted === 'title') return pickTitle(html);
  if (/^meta\[(name|property)=['"]?description['"]?\]$/i.test(wanted)) return pickDescription(html);
  if (wanted.startsWith('#')) {
    const id = wanted.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<([a-z0-9-]+)[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
    const match = String(html).match(re);
    return match ? stripHtml(match[2]) : '';
  }
  if (wanted.startsWith('.')) {
    const cls = wanted.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<([a-z0-9-]+)[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
    const match = String(html).match(re);
    return match ? stripHtml(match[2]) : '';
  }
  if (/^[a-z0-9-]+$/i.test(wanted)) {
    const re = new RegExp(`<${wanted}\\b[^>]*>([\\s\\S]*?)<\\/${wanted}>`, 'i');
    const match = String(html).match(re);
    return match ? stripHtml(match[1]) : '';
  }
  return '';
}

function normalizeHeaders(headers = {}) {
  const output = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const lower = String(key).toLowerCase();
    if (['host', 'content-length', 'connection'].includes(lower)) continue;
    output[key] = String(value);
  }
  return output;
}

function summarizeResponse(data, contentType = '', url = '', options = {}) {
  const raw = typeof data === 'string' ? data : JSON.stringify(data);
  const body = raw.slice(0, Number(options.maxReturnChars || 50000));
  const type = String(contentType || '').toLowerCase();
  const selector = String(options.selector || '').trim();
  if (type.includes('application/json') || /^[\s\n\r]*[{[]/.test(body)) {
    try {
      const json = JSON.parse(body);
      return {
        kind: 'json',
        title: json.title || json.name || '',
        text: JSON.stringify(json).slice(0, 4000),
        json
      };
    } catch {}
  }
  const selected = selector ? extractBySelector(body, selector) : '';
  return {
    kind: 'html',
    title: pickTitle(body),
    description: pickDescription(body),
    selected: selected.slice(0, 4000),
    text: (selected || stripHtml(body)).slice(0, 4000),
    links: pickLinks(body, url)
  };
}

function createWebDataBridge({ dataDir, getSettings, createAlert } = {}) {
  const logFile = path.join(dataDir || process.cwd(), 'web_bridge_logs.json');

  function log(row = {}) {
    const rows = readJson(logFile, []);
    const record = {
      id: row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: row.type || 'web',
      success: row.success !== false,
      url: row.url || row.sourceUrl || row.targetUrl || '',
      targetUrl: row.targetUrl || '',
      message: row.message || '',
      status: row.status || 0,
      createdAt: row.createdAt || new Date().toISOString(),
      meta: row.meta || {}
    };
    rows.unshift(record);
    writeJson(logFile, rows.slice(0, MAX_LOG_ROWS));
    return record;
  }

  function allowPrivate() {
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    return settings.web_bridge_allow_private === true || process.env.WEB_BRIDGE_ALLOW_PRIVATE === 'true';
  }

  async function fetchWebsite(options = {}) {
    const url = await assertSafeUrl(options.url, options.allowPrivate === true || allowPrivate());
    const timeout = Math.min(60000, Math.max(2000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS)));
    const maxBytes = Math.min(3000000, Math.max(10000, Number(options.maxBytes || DEFAULT_MAX_BYTES)));
    try {
      const response = await axios({
        url,
        method: String(options.method || 'GET').toUpperCase(),
        headers: {
          'User-Agent': options.userAgent || 'SuperSenderPro-WebBridge/1.0',
          ...normalizeHeaders(options.headers)
        },
        data: options.body || undefined,
        timeout,
        maxRedirects: 3,
        maxContentLength: maxBytes,
        responseType: 'text',
        transformResponse: value => value,
        validateStatus: status => status >= 200 && status < 400
      });
      const contentType = response.headers?.['content-type'] || '';
      const extracted = summarizeResponse(response.data, contentType, url, options);
      const result = {
        success: true,
        url,
        status: response.status,
        contentType,
        fetchedAt: new Date().toISOString(),
        extracted
      };
      log({ type: 'fetch', success: true, url, status: response.status, message: extracted.title || extracted.text?.slice(0, 120) || 'Fetched' });
      return result;
    } catch (error) {
      log({ type: 'fetch', success: false, url, status: error.response?.status || 0, message: error.message });
      throw error;
    }
  }

  async function forwardToWebsite(options = {}) {
    const targetUrl = await assertSafeUrl(options.targetUrl || options.url, options.allowPrivate === true || allowPrivate());
    const timeout = Math.min(60000, Math.max(2000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS)));
    const method = String(options.method || 'POST').toUpperCase();
    const payload = options.payload !== undefined ? options.payload : {};
    try {
      const response = await axios({
        url: targetUrl,
        method,
        headers: {
          'User-Agent': 'SuperSenderPro-WebBridge/1.0',
          'Content-Type': 'application/json',
          ...normalizeHeaders(options.headers)
        },
        data: payload,
        timeout,
        maxRedirects: 2,
        maxContentLength: DEFAULT_MAX_BYTES,
        responseType: 'text',
        transformResponse: value => value,
        validateStatus: status => status >= 200 && status < 400
      });
      const result = {
        success: true,
        targetUrl,
        status: response.status,
        responseText: String(response.data || '').slice(0, 1200),
        forwardedAt: new Date().toISOString()
      };
      log({ type: 'forward', success: true, targetUrl, status: response.status, message: 'Forwarded successfully' });
      return result;
    } catch (error) {
      log({ type: 'forward', success: false, targetUrl, status: error.response?.status || 0, message: error.message });
      if (typeof createAlert === 'function') {
        createAlert({
          type: 'web_bridge',
          title: 'Web forward failed',
          message: error.message,
          severity: 'warning',
          source: 'web_bridge',
          meta: { targetUrl }
        });
      }
      throw error;
    }
  }

  async function fetchAndForward(options = {}) {
    const fetched = await fetchWebsite(options);
    const payload = options.payload || {
      sourceUrl: fetched.url,
      fetchedAt: fetched.fetchedAt,
      title: fetched.extracted?.title || '',
      description: fetched.extracted?.description || '',
      text: fetched.extracted?.selected || fetched.extracted?.text || '',
      links: fetched.extracted?.links || []
    };
    const forwarded = await forwardToWebsite({
      targetUrl: options.targetUrl,
      method: options.forwardMethod || 'POST',
      headers: options.forwardHeaders || options.headers || {},
      payload,
      allowPrivate: options.allowPrivate
    });
    return { success: true, fetched, forwarded };
  }

  function listLogs(limit = 50) {
    return readJson(logFile, []).slice(0, Math.max(1, Math.min(200, Number(limit) || 50)));
  }

  function buildShareMessage(fetched = {}) {
    const ex = fetched.extracted || {};
    const title = ex.title || 'Website Update';
    const text = ex.selected || ex.description || ex.text || '';
    return `🌐 *${title}*\n\n${text.slice(0, 900)}${text.length > 900 ? '...' : ''}\n\nSource: ${fetched.url || ''}`;
  }

  return { fetchWebsite, forwardToWebsite, fetchAndForward, listLogs, buildShareMessage };
}

module.exports = { createWebDataBridge };
