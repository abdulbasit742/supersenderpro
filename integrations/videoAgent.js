const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function safeId(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `provider-${Date.now()}`;
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[VideoAgent] Could not read ${path.basename(filePath)}:`, error.message);
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function maskSecret(value = '') {
  const raw = String(value || '');
  if (!raw) return '';
  if (raw.length <= 8) return '********';
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
}

function normalizePlatforms(input, normalizeSocialPlatform) {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[,\n|]+/);
  const out = raw
    .map(item => normalizeSocialPlatform(String(item || '').trim()))
    .filter(Boolean);
  return [...new Set(out)];
}

function isRemoteUrl(value = '') {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function safeFilename(name = '') {
  return String(name || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140) || `asset-${Date.now()}`;
}

function extractPath(obj, selector = '') {
  const raw = String(selector || '').trim();
  if (!raw) return undefined;
  const parts = raw.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function findFirstValue(obj, selectors = []) {
  for (const selector of selectors) {
    const value = extractPath(obj, selector);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function parseHeaderText(raw = '') {
  const lines = String(raw || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const meta = {};
  let bodyLines = lines;
  const sepIndex = lines.findIndex(line => line.trim() === '---');
  if (sepIndex >= 0) {
    for (const line of lines.slice(0, sepIndex)) {
      const match = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
      if (match) meta[match[1].trim()] = match[2].trim();
    }
    bodyLines = lines.slice(sepIndex + 1);
  } else {
    let index = 0;
    for (; index < lines.length; index += 1) {
      const match = lines[index].match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
      if (!match) break;
      meta[match[1].trim()] = match[2].trim();
    }
    if (index > 0) bodyLines = lines.slice(index);
  }
  return { meta, body: bodyLines.join('\n').trim() };
}

function createVideoAgent(options = {}) {
  const {
    app,
    dataDir,
    projectRoot,
    settings,
    io,
    normalizeSocialPlatform,
    SOCIAL_PLATFORMS,
    publishSocialPost,
    recordSocialEvent,
    recordSocialPost,
    getPublicBaseUrl
  } = options;

  const jobsFile = path.join(dataDir, 'video_auto_posts.json');
  const providersFile = path.join(dataDir, 'video_ai_providers.json');
  let jobs = readJson(jobsFile, []);
  let providers = readJson(providersFile, []);

  function saveJobs() {
    writeJson(jobsFile, jobs);
  }

  function saveProviders() {
    writeJson(providersFile, providers);
  }

  function rootDir() {
    const configured = String(settings.video_auto_post_directory || process.env.VIDEO_AUTO_POST_DIR || 'video-auto-posts').trim();
    return path.isAbsolute(configured) ? configured : path.join(projectRoot, configured);
  }

  function dirs() {
    const root = rootDir();
    return {
      root,
      inbox: path.join(root, 'inbox'),
      queued: path.join(root, 'queued'),
      assets: path.join(root, 'assets'),
      generated: path.join(root, 'generated'),
      posted: path.join(root, 'posted'),
      failed: path.join(root, 'failed'),
      examples: path.join(root, 'examples')
    };
  }

  function publicBaseUrl() {
    return String(settings.video_public_base_url || process.env.VIDEO_PUBLIC_BASE_URL || getPublicBaseUrl() || '').replace(/\/+$/, '');
  }

  function ensureDirs() {
    const d = dirs();
    Object.values(d).forEach(dir => fs.mkdirSync(dir, { recursive: true }));
    const keep = path.join(d.inbox, '.gitkeep');
    if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');
    const jsonExample = path.join(d.examples, 'ai-video-post.json');
    if (!fs.existsSync(jsonExample)) {
      fs.writeFileSync(jsonExample, JSON.stringify({
        provider: 'auto',
        platforms: ['facebook', 'instagram', 'linkedin'],
        title: 'ChatGPT offer reel',
        prompt: 'Create a short vertical promotional video for AI Tools Store showing ChatGPT Plus, Claude Pro, Cursor Pro, and Gemini Advanced plans with energetic motion graphics.',
        message: 'AI Tools Store update: ChatGPT Plus, Claude Pro, Cursor Pro aur Gemini Advanced available hain. DM for today rates.',
        durationSeconds: 8,
        aspectRatio: '9:16',
        image: 'optional-reference.jpg',
        scheduledAt: ''
      }, null, 2));
    }
    const textExample = path.join(d.examples, 'video-post-template.txt');
    if (!fs.existsSync(textExample)) {
      fs.writeFileSync(textExample, [
        'provider: auto',
        'platforms: facebook, instagram, linkedin',
        'durationSeconds: 8',
        'aspectRatio: 9:16',
        'message: AI Tools Store update. DM for today rates.',
        'scheduledAt:',
        '---',
        'Create a clean vertical AI tools promo video with ChatGPT, Claude, Cursor, Gemini names, fast delivery, and trusted support.'
      ].join('\n'));
    }
    return d;
  }

  function assetUrl(filename, kind = 'assets') {
    const route = kind === 'generated' ? 'video-auto-generated' : 'video-auto-assets';
    return `${publicBaseUrl()}/${route}/${encodeURIComponent(filename).replace(/%2F/gi, '/')}`;
  }

  function resolveLocalAsset(value = '', sourceFile = '', allowed = IMAGE_EXTENSIONS, destinationKind = 'assets') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (isRemoteUrl(raw)) return raw;
    const d = ensureDirs();
    const candidates = [
      path.isAbsolute(raw) ? raw : path.join(path.dirname(sourceFile || d.inbox), raw),
      path.isAbsolute(raw) ? raw : path.join(d.inbox, raw),
      path.isAbsolute(raw) ? raw : path.join(d.root, raw)
    ];
    const source = candidates.find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    if (!source) return raw;
    const ext = path.extname(source).toLowerCase();
    if (!allowed.has(ext)) throw new Error(`Unsupported asset type ${ext}`);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${stamp}-${safeFilename(path.basename(source))}`;
    const destinationDir = destinationKind === 'generated' ? d.generated : d.assets;
    fs.copyFileSync(source, path.join(destinationDir, filename));
    return assetUrl(filename, destinationKind);
  }

  function envProviders() {
    const rows = [];
    for (let index = 1; index <= 5; index += 1) {
      const name = process.env[`VIDEO_PROVIDER_${index}_NAME`] || '';
      const apiUrl = process.env[`VIDEO_PROVIDER_${index}_API_URL`] || '';
      const apiKey = process.env[`VIDEO_PROVIDER_${index}_API_KEY`] || '';
      if (!name && !apiUrl && !apiKey) continue;
      rows.push({
        id: safeId(name || `provider-${index}`),
        name: name || `Provider ${index}`,
        apiUrl,
        apiKey,
        authHeader: process.env[`VIDEO_PROVIDER_${index}_AUTH_HEADER`] || 'Authorization',
        authPrefix: process.env[`VIDEO_PROVIDER_${index}_AUTH_PREFIX`] || 'Bearer ',
        method: process.env[`VIDEO_PROVIDER_${index}_METHOD`] || 'POST',
        statusUrl: process.env[`VIDEO_PROVIDER_${index}_STATUS_URL`] || '',
        resultPath: process.env[`VIDEO_PROVIDER_${index}_RESULT_PATH`] || '',
        idPath: process.env[`VIDEO_PROVIDER_${index}_ID_PATH`] || 'id',
        enabled: process.env[`VIDEO_PROVIDER_${index}_ENABLED`] !== 'false',
        source: 'env'
      });
    }
    return rows;
  }

  function allProviders() {
    const byId = new Map();
    for (const row of providers) byId.set(row.id, { ...row, source: row.source || 'saved' });
    for (const row of envProviders()) byId.set(row.id, { ...(byId.get(row.id) || {}), ...row });
    return [...byId.values()];
  }

  function publicProvider(row = {}) {
    return {
      id: row.id,
      name: row.name,
      apiUrl: row.apiUrl ? row.apiUrl.replace(/([?&](?:key|token|api_key)=)[^&]+/gi, '$1***') : '',
      statusUrl: row.statusUrl || '',
      authHeader: row.authHeader || 'Authorization',
      authPrefix: row.authPrefix || 'Bearer ',
      method: row.method || 'POST',
      resultPath: row.resultPath || '',
      idPath: row.idPath || 'id',
      enabled: row.enabled !== false,
      configured: !!(row.apiUrl && row.apiKey),
      tokenMasked: maskSecret(row.apiKey || ''),
      source: row.source || 'saved'
    };
  }

  function findProvider(idOrName = '') {
    const key = String(idOrName || '').trim().toLowerCase();
    const rows = allProviders().filter(row => row.enabled !== false);
    if (!key || key === 'auto') return rows.find(row => row.apiUrl && row.apiKey) || null;
    return rows.find(row => row.id === key || String(row.name || '').toLowerCase() === key) || null;
  }

  function saveProvider(input = {}) {
    const name = String(input.name || input.id || '').trim();
    if (!name) throw new Error('Provider name is required');
    const id = safeId(input.id || name);
    const row = {
      id,
      name,
      apiUrl: String(input.apiUrl || '').trim(),
      apiKey: String(input.apiKey || '').trim(),
      authHeader: String(input.authHeader || 'Authorization').trim(),
      authPrefix: String(input.authPrefix ?? 'Bearer '),
      method: String(input.method || 'POST').toUpperCase(),
      statusUrl: String(input.statusUrl || '').trim(),
      resultPath: String(input.resultPath || '').trim(),
      idPath: String(input.idPath || 'id').trim(),
      enabled: input.enabled !== false,
      updatedAt: new Date().toISOString(),
      source: 'saved'
    };
    const index = providers.findIndex(item => item.id === id);
    if (index >= 0) providers[index] = { ...providers[index], ...row, apiKey: row.apiKey || providers[index].apiKey || '' };
    else providers.unshift({ ...row, createdAt: new Date().toISOString() });
    saveProviders();
    return publicProvider(providers.find(item => item.id === id));
  }

  function parseTextJob(raw = '', filePath = '') {
    const { meta, body } = parseHeaderText(raw);
    const prompt = String(meta.prompt || body || '').trim();
    return {
      provider: meta.provider || 'auto',
      title: meta.title || (filePath ? path.basename(filePath, path.extname(filePath)) : 'AI video job'),
      platforms: normalizePlatforms(meta.platforms || meta.platform || meta.channels, normalizeSocialPlatform),
      prompt,
      message: String(meta.message || meta.caption || prompt).trim(),
      imageUrl: meta.imageUrl || meta.image || meta.referenceImage || '',
      videoUrl: meta.videoUrl || meta.video || '',
      scheduledAt: meta.scheduledAt || meta.schedule || '',
      durationSeconds: Number(meta.durationSeconds || meta.duration || 8),
      aspectRatio: meta.aspectRatio || meta.ratio || '9:16',
      accountId: meta.accountId || ''
    };
  }

  function parseJobFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf8');
    let parsed;
    if (ext === '.json') {
      const json = JSON.parse(raw);
      parsed = {
        provider: json.provider || 'auto',
        title: json.title || path.basename(filePath, ext),
        platforms: normalizePlatforms(json.platforms || json.platform || json.channels, normalizeSocialPlatform),
        prompt: String(json.prompt || json.text || '').trim(),
        message: String(json.message || json.caption || json.prompt || '').trim(),
        imageUrl: json.imageUrl || json.image || json.referenceImage || '',
        videoUrl: json.videoUrl || json.video || '',
        scheduledAt: json.scheduledAt || json.schedule || '',
        durationSeconds: Number(json.durationSeconds || json.duration || 8),
        aspectRatio: json.aspectRatio || json.ratio || '9:16',
        accountId: json.accountId || '',
        dryRun: json.dryRun === true
      };
    } else {
      parsed = parseTextJob(raw, filePath);
    }
    if (!parsed.prompt && !parsed.videoUrl) throw new Error('Video prompt is required unless videoUrl is provided');
    if (!parsed.message) parsed.message = parsed.prompt;
    if (!parsed.platforms.length) parsed.platforms = ['facebook', 'instagram', 'linkedin'].filter(p => SOCIAL_PLATFORMS[p]);
    parsed.imageUrl = resolveLocalAsset(parsed.imageUrl, filePath, IMAGE_EXTENSIONS, 'assets');
    parsed.videoUrl = resolveLocalAsset(parsed.videoUrl, filePath, VIDEO_EXTENSIONS, 'generated');
    parsed.scheduledAt = parsed.scheduledAt ? toIsoDate(parsed.scheduledAt) : new Date().toISOString();
    parsed.durationSeconds = Math.max(3, Math.min(60, Number(parsed.durationSeconds || 8)));
    return parsed;
  }

  function moveFile(sourcePath, destinationDir) {
    if (!sourcePath || !fs.existsSync(sourcePath)) return '';
    fs.mkdirSync(destinationDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(destinationDir, `${stamp}-${path.basename(sourcePath)}`);
    try {
      fs.renameSync(sourcePath, destination);
    } catch {
      fs.copyFileSync(sourcePath, destination);
      fs.unlinkSync(sourcePath);
    }
    return destination;
  }

  function importFiles() {
    const d = ensureDirs();
    const allowed = new Set(['.json', '.txt', '.md']);
    const imported = [];
    const files = fs.readdirSync(d.inbox, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => allowed.has(path.extname(name).toLowerCase()))
      .filter(name => !name.startsWith('.') && !/^readme/i.test(name));
    for (const name of files) {
      const sourcePath = path.join(d.inbox, name);
      try {
        const parsed = parseJobFile(sourcePath);
        const queuedFile = moveFile(sourcePath, d.queued);
        const row = {
          id: uuid(),
          ...parsed,
          originalName: name,
          sourceFile: sourcePath,
          queuedFile,
          status: 'queued',
          attempts: 0,
          results: [],
          providerResponse: null,
          lastError: '',
          nextRetryAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        jobs.unshift(row);
        imported.push(row);
        recordSocialEvent?.({ platform: 'facebook', type: 'video_job_imported', text: `${row.originalName} queued for video generation` });
      } catch (error) {
        const failedFile = moveFile(sourcePath, d.failed);
        const row = {
          id: uuid(),
          title: path.basename(name, path.extname(name)),
          originalName: name,
          sourceFile: sourcePath,
          queuedFile: failedFile,
          platforms: [],
          prompt: '',
          message: '',
          status: 'failed',
          attempts: 0,
          results: [],
          lastError: error.message,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        jobs.unshift(row);
        imported.push(row);
        console.error('[VideoAgent] Import failed:', error.message);
      }
    }
    if (imported.length) saveJobs();
    return imported;
  }

  function buildProviderHeaders(provider) {
    const headers = { 'Content-Type': 'application/json' };
    const header = String(provider.authHeader || 'Authorization').trim();
    let prefix = provider.authPrefix ?? 'Bearer ';
    if (String(prefix).toLowerCase() === 'bearer') prefix = 'Bearer ';
    if (header && provider.apiKey) headers[header] = `${prefix}${provider.apiKey}`;
    return headers;
  }

  async function callProvider(provider, job) {
    if (!provider?.apiUrl || !provider?.apiKey) {
      throw new Error('Video provider credentials not configured. Add provider API URL and API key first.');
    }
    const body = {
      prompt: job.prompt,
      durationSeconds: job.durationSeconds,
      duration: job.durationSeconds,
      aspectRatio: job.aspectRatio,
      ratio: job.aspectRatio,
      imageUrl: job.imageUrl || undefined,
      referenceImage: job.imageUrl || undefined,
      metadata: { jobId: job.id, title: job.title || '' }
    };
    const response = await fetch(provider.apiUrl, {
      method: String(provider.method || 'POST').toUpperCase(),
      headers: buildProviderHeaders(provider),
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(async () => ({ rawText: await response.text().catch(() => '') }));
    if (!response.ok) throw new Error(data.error?.message || data.message || `Video provider failed (${response.status})`);
    return data;
  }

  async function pollProvider(provider, initialData) {
    if (!provider.statusUrl) return initialData;
    const id = findFirstValue(initialData, [provider.idPath || 'id', 'jobId', 'taskId', 'data.id', 'result.id']);
    if (!id) return initialData;
    const attempts = Math.max(1, Math.min(20, Number(provider.pollAttempts || process.env.VIDEO_PROVIDER_POLL_ATTEMPTS || 6)));
    const intervalMs = Math.max(1000, Number(provider.pollIntervalSeconds || process.env.VIDEO_PROVIDER_POLL_INTERVAL_SECONDS || 10) * 1000);
    let latest = initialData;
    for (let index = 0; index < attempts; index += 1) {
      await sleep(index === 0 ? 1500 : intervalMs);
      const url = provider.statusUrl.replace('{id}', encodeURIComponent(id));
      const response = await fetch(url, { method: 'GET', headers: buildProviderHeaders(provider) });
      latest = await response.json().catch(() => latest);
      if (!response.ok) throw new Error(latest.error?.message || latest.message || `Video status failed (${response.status})`);
      const status = String(findFirstValue(latest, ['status', 'data.status', 'state', 'result.status']) || '').toLowerCase();
      const video = extractVideoResult(latest, provider);
      if (video.videoUrl || video.videoBase64) return latest;
      if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
        throw new Error(latest.error?.message || latest.message || `Video generation ${status}`);
      }
    }
    return latest;
  }

  function extractVideoResult(data, provider = {}) {
    const custom = provider.resultPath ? findFirstValue(data, [provider.resultPath]) : '';
    const videoUrl = custom || findFirstValue(data, [
      'videoUrl',
      'video_url',
      'url',
      'output[0]',
      'output.videoUrl',
      'output.video_url',
      'data.videoUrl',
      'data.video_url',
      'data.url',
      'result.videoUrl',
      'result.video_url',
      'result.url'
    ]);
    const videoBase64 = findFirstValue(data, ['videoBase64', 'video_base64', 'base64', 'data.videoBase64', 'result.videoBase64']);
    return { videoUrl: String(videoUrl || '').trim(), videoBase64: String(videoBase64 || '').trim() };
  }

  function saveGeneratedBase64(base64 = '', job = {}) {
    const d = ensureDirs();
    const cleaned = String(base64 || '').replace(/^data:video\/[a-z0-9.+-]+;base64,/i, '');
    if (!cleaned) return '';
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeFilename(job.title || job.id)}.mp4`;
    fs.writeFileSync(path.join(d.generated, filename), Buffer.from(cleaned, 'base64'));
    return assetUrl(filename, 'generated');
  }

  async function generateForJob(job) {
    if (job.videoUrl) return { videoUrl: job.videoUrl, provider: 'existing' };
    const provider = findProvider(job.provider);
    if (!provider) throw new Error('Video provider credentials not configured. Add 3-5 AI video API keys in Video Agent.');
    const initialData = await callProvider(provider, job);
    const finalData = await pollProvider(provider, initialData);
    const result = extractVideoResult(finalData, provider);
    let videoUrl = result.videoUrl;
    if (!videoUrl && result.videoBase64) videoUrl = saveGeneratedBase64(result.videoBase64, job);
    if (!videoUrl) throw new Error('Video provider response did not include a video URL. Set resultPath for this provider.');
    return {
      videoUrl,
      provider: provider.id,
      providerResponse: finalData
    };
  }

  async function publishJob(job) {
    const platforms = normalizePlatforms(job.platforms, normalizeSocialPlatform);
    const results = [];
    for (const platform of platforms) {
      try {
        const result = await publishSocialPost(platform, {
          accountId: job.accountId || '',
          message: job.message,
          imageUrl: job.imageUrl || '',
          videoUrl: job.videoUrl || '',
          source: 'video_agent'
        });
        results.push({ platform, success: true, externalId: result.externalId || '', postId: result.post?.id || result.postId || '' });
      } catch (error) {
        results.push({
          platform,
          success: false,
          blocked: /credential|configured|token|access token|page id|user id|author urn|missing/i.test(error.message || ''),
          error: error.message
        });
      }
    }
    return results;
  }

  async function processJobs(options = {}) {
    const force = options.force === true;
    const imported = importFiles();
    if (!force && settings.video_agent_enabled === false) {
      return { success: true, enabled: false, imported: imported.length, processed: 0, jobs: [] };
    }
    const now = Date.now();
    const candidates = jobs
      .filter(job => ['queued', 'blocked', 'partial'].includes(job.status))
      .filter(job => force || !job.scheduledAt || new Date(job.scheduledAt).getTime() <= now)
      .filter(job => force || !job.nextRetryAt || new Date(job.nextRetryAt).getTime() <= now)
      .slice(0, Math.max(1, Math.min(20, Number(options.limit || 5))));
    const d = ensureDirs();
    const processed = [];
    for (const job of candidates) {
      job.status = 'generating';
      job.attempts = Number(job.attempts || 0) + 1;
      job.updatedAt = new Date().toISOString();
      saveJobs();
      try {
        const generated = await generateForJob(job);
        job.videoUrl = generated.videoUrl;
        job.provider = generated.provider || job.provider;
        job.providerResponse = generated.providerResponse ? { received: true } : job.providerResponse;
        job.generatedAt = new Date().toISOString();
        job.status = 'posting';
        saveJobs();
        const results = await publishJob(job);
        const successCount = results.filter(row => row.success).length;
        const blockedCount = results.filter(row => row.blocked).length;
        job.results = [...(job.results || []), { at: new Date().toISOString(), attempt: job.attempts, results }];
        job.updatedAt = new Date().toISOString();
        if (successCount > 0) {
          job.status = successCount === results.length ? 'posted' : 'partial';
          job.publishedAt = new Date().toISOString();
          job.postedFile = moveFile(job.queuedFile, d.posted);
          job.nextRetryAt = null;
          recordSocialEvent?.({ platform: results.find(row => row.success)?.platform || 'facebook', type: 'video_agent_published', text: `${job.title || job.originalName} video posted (${successCount}/${results.length})` });
        } else if (blockedCount === results.length) {
          job.status = 'blocked';
          job.lastError = results.map(row => `${row.platform}: ${row.error}`).join(' | ');
          job.nextRetryAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        } else if (job.attempts >= 3) {
          job.status = 'failed';
          job.lastError = results.map(row => `${row.platform}: ${row.error}`).join(' | ');
          job.failedFile = moveFile(job.queuedFile, d.failed);
          job.nextRetryAt = null;
          recordSocialPost?.({ platform: results[0]?.platform || 'facebook', message: job.message, imageUrl: job.imageUrl, videoUrl: job.videoUrl, status: 'failed', error: job.lastError });
        } else {
          job.status = 'queued';
          job.lastError = results.map(row => `${row.platform}: ${row.error}`).join(' | ');
          job.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        }
      } catch (error) {
        job.updatedAt = new Date().toISOString();
        job.lastError = error.message;
        if (/credential|configured|api key|token|missing/i.test(error.message || '')) {
          job.status = 'blocked';
          job.nextRetryAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        } else if (job.attempts >= 3) {
          job.status = 'failed';
          job.failedFile = moveFile(job.queuedFile, d.failed);
          job.nextRetryAt = null;
        } else {
          job.status = 'queued';
          job.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        }
        console.error('[VideoAgent] Job failed:', error.message);
      }
      processed.push(job);
      saveJobs();
    }
    if (processed.length) io?.emit?.('video-agent:jobs', { processed: processed.length, jobs: processed.slice(0, 10) });
    return { success: true, enabled: settings.video_agent_enabled !== false, imported: imported.length, processed: processed.length, jobs: processed };
  }

  function summary() {
    const d = ensureDirs();
    const counts = jobs.reduce((acc, row) => {
      acc[row.status || 'unknown'] = (acc[row.status || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    return {
      enabled: settings.video_agent_enabled !== false,
      intervalSeconds: Math.max(60, Number(settings.video_auto_post_interval_seconds || process.env.VIDEO_AUTO_POST_INTERVAL_SECONDS || 120)),
      directory: d.root,
      inbox: d.inbox,
      queued: d.queued,
      assets: d.assets,
      generated: d.generated,
      posted: d.posted,
      failed: d.failed,
      publicBaseUrl: publicBaseUrl(),
      providers: allProviders().map(publicProvider),
      counts,
      latest: jobs.slice(0, 20)
    };
  }

  function createManualJob(input = {}) {
    const prompt = String(input.prompt || '').trim();
    const videoUrl = String(input.videoUrl || '').trim();
    if (!prompt && !videoUrl) throw new Error('Prompt or videoUrl is required');
    const row = {
      id: uuid(),
      provider: input.provider || 'auto',
      title: input.title || 'Manual AI video job',
      platforms: normalizePlatforms(input.platforms || input.platform, normalizeSocialPlatform).filter(p => SOCIAL_PLATFORMS[p]),
      prompt,
      message: String(input.message || input.caption || prompt || 'AI Tools Store update').trim(),
      imageUrl: String(input.imageUrl || '').trim(),
      videoUrl,
      scheduledAt: input.scheduledAt ? toIsoDate(input.scheduledAt) : new Date().toISOString(),
      durationSeconds: Math.max(3, Math.min(60, Number(input.durationSeconds || 8))),
      aspectRatio: input.aspectRatio || '9:16',
      accountId: input.accountId || '',
      originalName: 'manual',
      sourceFile: '',
      queuedFile: '',
      status: 'queued',
      attempts: 0,
      results: [],
      lastError: '',
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!row.platforms.length) row.platforms = ['facebook', 'instagram', 'linkedin'].filter(p => SOCIAL_PLATFORMS[p]);
    jobs.unshift(row);
    saveJobs();
    return row;
  }

  function registerRoutes() {
    if (!app) return;
    app.get('/api/video-agent/status', (req, res) => {
      try {
        res.json({ success: true, ...summary() });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    app.get('/api/video-agent/providers', (req, res) => {
      res.json({ success: true, providers: allProviders().map(publicProvider) });
    });
    app.post('/api/video-agent/providers', (req, res) => {
      try {
        const provider = saveProvider(req.body || {});
        res.json({ success: true, provider });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
    app.get('/api/video-agent/jobs', (req, res) => {
      const status = String(req.query.status || '').trim().toLowerCase();
      const rows = status ? jobs.filter(job => String(job.status || '').toLowerCase() === status) : jobs;
      res.json({ success: true, jobs: rows.slice(0, Math.max(1, Math.min(500, Number(req.query.limit || 100)))) });
    });
    app.post('/api/video-agent/jobs', (req, res) => {
      try {
        const job = createManualJob(req.body || {});
        res.json({ success: true, job });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
    app.post('/api/video-agent/scan', (req, res) => {
      try {
        const imported = importFiles();
        res.json({ success: true, imported: imported.length, summary: summary() });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    app.post('/api/video-agent/run', async (req, res) => {
      try {
        const result = await processJobs({ force: req.body?.force === true, limit: req.body?.limit || 5 });
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    app.post('/api/video-agent/jobs/:id/retry', (req, res) => {
      const row = jobs.find(job => job.id === req.params.id);
      if (!row) return res.status(404).json({ success: false, error: 'Video job not found' });
      row.status = 'queued';
      row.nextRetryAt = null;
      row.updatedAt = new Date().toISOString();
      saveJobs();
      res.json({ success: true, job: row });
    });
    app.delete('/api/video-agent/jobs/:id', (req, res) => {
      const before = jobs.length;
      jobs = jobs.filter(job => job.id !== req.params.id);
      saveJobs();
      res.json({ success: true, removed: before - jobs.length });
    });
  }

  async function runTick() {
    try {
      return await processJobs();
    } catch (error) {
      console.error('[VideoAgent] Tick failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  ensureDirs();
  registerRoutes();

  return {
    ensureDirs,
    importFiles,
    process: processJobs,
    runTick,
    summary,
    allProviders,
    saveProvider,
    createManualJob
  };
}

module.exports = { createVideoAgent };
