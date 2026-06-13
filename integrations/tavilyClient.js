const DEFAULT_BASE_URL = 'https://api.tavily.com';
let axios = null;
try {
  axios = require('axios');
} catch {}

function cleanText(value) {
  return String(value || '').trim();
}

function numberInRange(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function createTavilyClient(options = {}) {
  const apiKey = cleanText(options.apiKey || process.env.TAVILY_API_KEY);
  const baseUrl = cleanText(options.baseUrl || process.env.TAVILY_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const defaultSearchDepth = cleanText(options.searchDepth || process.env.TAVILY_SEARCH_DEPTH || 'advanced') || 'advanced';
  const defaultMaxResults = numberInRange(options.maxResults || process.env.TAVILY_MAX_RESULTS, 8, 1, 20);
  const timeoutMs = numberInRange(options.timeoutMs || process.env.TAVILY_TIMEOUT_MS, 20000, 3000, 120000);

  function proxyConfig() {
    const raw = cleanText(options.proxy || process.env.TAVILY_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
    if (!raw) return undefined;
    try {
      const parsed = new URL(raw);
      if (!parsed.hostname || !parsed.port) return undefined;
      return {
        protocol: parsed.protocol.replace(':', '') || 'http',
        host: parsed.hostname,
        port: Number(parsed.port),
        auth: parsed.username ? {
          username: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password || '')
        } : undefined
      };
    } catch {
      return undefined;
    }
  }

  async function request(endpoint, payload = {}) {
    if (!apiKey) {
      const err = new Error('Tavily API key missing. Set TAVILY_API_KEY in .env.');
      err.code = 'TAVILY_MISSING_KEY';
      throw err;
    }
    const url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}`;
    if (axios) {
      try {
        const response = await axios.post(url, payload, {
          timeout: timeoutMs,
          proxy: proxyConfig(),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        return response.data || {};
      } catch (error) {
        const detail = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || error.message;
        const err = new Error(`Tavily ${endpoint} failed: ${detail}`);
        err.status = error.response?.status;
        err.data = error.response?.data;
        throw err;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (timer.unref) timer.unref();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }
      if (!response.ok) {
        const detail = data?.error || data?.message || data?.detail || response.statusText;
        const err = new Error(`Tavily ${endpoint} failed: ${detail}`);
        err.status = response.status;
        err.data = data;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function search(query, options = {}) {
    const q = cleanText(query);
    if (!q) throw new Error('Search query is required.');
    return request('search', {
      query: q,
      search_depth: options.searchDepth || defaultSearchDepth,
      max_results: numberInRange(options.maxResults, defaultMaxResults, 1, 20),
      include_answer: options.includeAnswer !== false,
      include_raw_content: options.includeRawContent === true,
      include_images: options.includeImages === true,
      topic: options.topic || undefined,
      days: options.days || undefined
    });
  }

  async function extract(urlOrUrls, options = {}) {
    const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
    const cleaned = urls.map(cleanText).filter(Boolean);
    if (!cleaned.length) throw new Error('At least one URL is required.');
    return request('extract', {
      urls: cleaned,
      extract_depth: options.extractDepth || 'advanced',
      include_images: options.includeImages === true,
      format: options.format || 'markdown'
    });
  }

  async function research(query, options = {}) {
    const q = cleanText(query);
    if (!q) throw new Error('Research query is required.');
    return request('research', {
      query: q,
      max_results: numberInRange(options.maxResults, defaultMaxResults, 1, 20)
    });
  }

  function isConfigured() {
    return !!apiKey;
  }

  return { isConfigured, search, extract, research };
}

function formatSearchForWhatsApp(title, response) {
  const results = Array.isArray(response?.results) ? response.results : [];
  const lines = [
    `🔎 *${title || 'Web Intelligence Results'}*`,
    ''
  ];
  if (response?.answer) {
    lines.push(response.answer, '');
  }
  results.slice(0, 8).forEach((item, index) => {
    lines.push(`${index + 1}. *${item.title || 'Result'}*`);
    if (item.url) lines.push(item.url);
    if (item.content) lines.push(String(item.content).slice(0, 220));
    lines.push('');
  });
  return lines.join('\n').trim();
}

module.exports = { createTavilyClient, formatSearchForWhatsApp };
