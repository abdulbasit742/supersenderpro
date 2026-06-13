const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_ROWS = 2000;

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

function cleanText(value = '') {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeId(value = '') {
  return String(value || '').trim().toLowerCase();
}

function hashText(value = '') {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 16);
}

function slugify(value = '') {
  const base = String(value || 'scholarship')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return base || `scholarship-${Date.now().toString(36)}`;
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractLinks(text = '') {
  return [...new Set((String(text || '').match(/https?:\/\/[^\s)]+/gi) || []).map(link => link.replace(/[.,]+$/g, '')))];
}

function extractDeadline(text = '') {
  const patterns = [
    /\b(?:deadline|last date|apply by|closing date|due date)\s*[:\-]?\s*([A-Za-z]{3,12}\s+\d{1,2},?\s+\d{4})/i,
    /\b(?:deadline|last date|apply by|closing date|due date)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4})\b/i
  ];
  for (const re of patterns) {
    const match = String(text || '').match(re);
    if (match) return match[1].trim();
  }
  return '';
}

function extractCountry(text = '') {
  const countries = [
    'Pakistan', 'USA', 'United States', 'UK', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'Italy', 'Turkey', 'China', 'Japan', 'Korea', 'Saudi Arabia', 'UAE', 'Qatar',
    'Malaysia', 'Hungary', 'Romania', 'Netherlands', 'Sweden', 'Finland', 'Ireland'
  ];
  const lower = String(text || '').toLowerCase();
  return countries.find(country => lower.includes(country.toLowerCase())) || '';
}

function extractLevels(text = '') {
  const lower = String(text || '').toLowerCase();
  const levels = [];
  if (/\b(bs|bachelor|undergraduate|ug)\b/.test(lower)) levels.push('BS/Undergraduate');
  if (/\b(ms|master|masters|graduate)\b/.test(lower)) levels.push('MS/Masters');
  if (/\b(phd|doctorate)\b/.test(lower)) levels.push('PhD');
  if (/\b(inter|fsc|matric|school)\b/.test(lower)) levels.push('School/College');
  return [...new Set(levels)];
}

function extractBenefits(text = '') {
  const lower = String(text || '').toLowerCase();
  const benefits = [];
  if (/fully funded|full funding|tuition waiver|free tuition/.test(lower)) benefits.push('Fully/partially funded tuition');
  if (/stipend|monthly allowance|living allowance/.test(lower)) benefits.push('Stipend / living allowance');
  if (/airfare|travel|ticket/.test(lower)) benefits.push('Travel support');
  if (/visa/.test(lower)) benefits.push('Visa guidance/support');
  if (/accommodation|hostel|housing/.test(lower)) benefits.push('Accommodation support');
  return benefits.length ? benefits : ['Check official notice for funding details'];
}

function looksLikeScholarship(text = '') {
  const value = String(text || '').toLowerCase();
  if (!value || value.length < 18) return false;
  const keywords = [
    'scholarship', 'fellowship', 'studentship', 'fully funded', 'tuition waiver',
    'hec', 'daad', 'erasmus', 'chevening', 'fulbright', 'mext', 'stipendium',
    'admission open', 'apply online', 'last date', 'deadline', 'undergraduate', 'masters', 'phd'
  ];
  return keywords.some(keyword => value.includes(keyword));
}

function titleFromText(text = '') {
  const lines = cleanText(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const usable = lines.find(line => !/^https?:\/\//i.test(line) && line.length > 8) || lines[0] || 'Scholarship Opportunity';
  return usable.replace(/[*_~`]/g, '').slice(0, 140);
}

function parseScholarship(text = '', ctx = {}) {
  const body = cleanText(text);
  if (!looksLikeScholarship(body)) return null;
  const links = extractLinks(body);
  const title = titleFromText(body);
  const levels = extractLevels(body);
  const deadline = extractDeadline(body);
  const country = extractCountry(body);
  const benefits = extractBenefits(body);
  const summaryParts = [
    country ? `Country: ${country}` : '',
    levels.length ? `Level: ${levels.join(', ')}` : '',
    deadline ? `Deadline: ${deadline}` : '',
    benefits.length ? `Benefits: ${benefits.slice(0, 3).join(', ')}` : ''
  ].filter(Boolean);
  return {
    title,
    summary: summaryParts.length ? summaryParts.join(' | ') : body.slice(0, 220),
    rawText: body,
    links,
    applyLink: links[0] || '',
    deadline,
    country,
    levels,
    benefits,
    source: {
      groupId: ctx.groupId || ctx.chatId || '',
      groupName: ctx.groupName || ctx.chatName || '',
      senderName: ctx.senderName || ctx.authorName || '',
      senderNumber: ctx.senderNumber || ctx.authorNumber || '',
      messageId: ctx.messageId || ''
    },
    confidence: Math.min(0.98, 0.62 + (links.length ? 0.12 : 0) + (deadline ? 0.12 : 0) + (levels.length ? 0.08 : 0) + (country ? 0.06 : 0))
  };
}

function renderWebsiteHtml(post = {}, record = {}) {
  const benefits = (record.benefits || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const levels = (record.levels || []).map(item => `<span class="pill">${escapeHtml(item)}</span>`).join('');
  const raw = escapeHtml(record.rawText || '').replace(/\n/g, '<br>');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(record.title || 'Scholarship Opportunity')}</title>
  <meta name="description" content="${escapeHtml(record.summary || '')}">
  <style>
    body{margin:0;background:#0f172a;color:#e5e7eb;font-family:Arial,Helvetica,sans-serif;line-height:1.6}
    .wrap{max-width:900px;margin:0 auto;padding:34px 18px}
    .card{background:#172033;border:1px solid #334155;border-radius:14px;padding:26px;box-shadow:0 18px 50px rgba(0,0,0,.24)}
    h1{font-size:30px;line-height:1.15;margin:0 0 14px;color:#fff}
    .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:18px 0}
    .box{background:#0b1220;border:1px solid #253044;border-radius:10px;padding:12px}
    .pill{display:inline-block;background:#064e3b;color:#a7f3d0;border:1px solid #10b981;border-radius:999px;padding:4px 10px;margin:3px}
    a.btn{display:inline-block;background:#14b8a6;color:#00131a;text-decoration:none;font-weight:700;border-radius:9px;padding:12px 16px;margin-top:10px}
    .raw{background:#0b1220;border-radius:10px;padding:16px;margin-top:18px;color:#cbd5e1}
    .source{color:#94a3b8;font-size:13px;margin-top:18px}
  </style>
</head>
<body>
  <main class="wrap">
    <article class="card">
      <h1>${escapeHtml(record.title)}</h1>
      <p>${escapeHtml(record.summary || 'Scholarship details collected from WhatsApp source and formatted for quick sharing.')}</p>
      <div>${levels}</div>
      <div class="meta">
        <div class="box"><strong>Country</strong><br>${escapeHtml(record.country || 'Check official notice')}</div>
        <div class="box"><strong>Deadline</strong><br>${escapeHtml(record.deadline || 'Not mentioned')}</div>
        <div class="box"><strong>Source</strong><br>${escapeHtml(record.source?.groupName || 'WhatsApp')}</div>
      </div>
      <h3>Benefits</h3>
      <ul>${benefits}</ul>
      ${record.applyLink ? `<a class="btn" href="${escapeHtml(record.applyLink)}" target="_blank" rel="noopener">Apply / Official Link</a>` : ''}
      <div class="raw">${raw}</div>
      <div class="source">Published by SuperSender Pro. Verify details from official source before applying.</div>
    </article>
  </main>
</body>
</html>`;
}

function createScholarshipPipeline({ dataDir, getSettings, io } = {}) {
  const recordsFile = path.join(dataDir || process.cwd(), 'scholarship_pipeline.json');
  const websiteFile = path.join(dataDir || process.cwd(), 'scholarship_website_posts.json');
  const logsFile = path.join(dataDir || process.cwd(), 'scholarship_pipeline_logs.json');
  const pagesDir = path.join(dataDir || process.cwd(), 'scholarship-pages');

  function settings() {
    return typeof getSettings === 'function' ? (getSettings() || {}) : {};
  }

  function rows() {
    return readJson(recordsFile, []);
  }

  function posts() {
    return readJson(websiteFile, []);
  }

  function logs() {
    return readJson(logsFile, []);
  }

  function saveRows(nextRows) {
    writeJson(recordsFile, nextRows.slice(0, MAX_ROWS));
  }

  function savePosts(nextPosts) {
    writeJson(websiteFile, nextPosts.slice(0, MAX_ROWS));
  }

  function log(entry = {}) {
    const row = { id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), ...entry };
    writeJson(logsFile, [row, ...logs()].slice(0, 500));
    return row;
  }

  function sourceGroups() {
    const cfg = settings();
    return [
      ...(Array.isArray(cfg.scholarship_source_groups) ? cfg.scholarship_source_groups : []),
      ...String(cfg.scholarship_source_group_ids || process.env.SCHOLARSHIP_GROUPS || '').split(',')
    ].map(normalizeId).filter(Boolean);
  }

  function isAllowedSource(ctx = {}) {
    const cfg = settings();
    if (cfg.scholarship_pipeline_enabled === false) return false;
    const allowed = sourceGroups();
    if (!allowed.length) return true;
    const id = normalizeId(ctx.groupId || ctx.chatId || '');
    const name = normalizeId(ctx.groupName || ctx.chatName || '');
    return allowed.some(item => id === item || name.includes(item));
  }

  function publicBaseUrl() {
    const cfg = settings();
    return String(cfg.scholarship_public_base_url || cfg.social_public_base_url || process.env.PUBLIC_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  }

  function ingestMessage(ctx = {}) {
    if (!isAllowedSource(ctx)) return null;
    const parsed = parseScholarship(ctx.body || ctx.text || '', ctx);
    if (!parsed || parsed.confidence < Number(settings().scholarship_min_confidence || 0.7)) return null;
    const key = parsed.source.messageId || hashText(`${parsed.rawText}|${parsed.source.groupId}`);
    const existing = rows().find(row => row.key === key || row.hash === hashText(parsed.rawText));
    if (existing) return existing;
    const record = {
      id: `SCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      key,
      hash: hashText(parsed.rawText),
      status: 'captured',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...parsed
    };
    saveRows([record, ...rows()]);
    log({ type: 'captured', recordId: record.id, title: record.title, groupName: record.source?.groupName || '' });
    try { io?.emit?.('scholarship:capture', record); } catch {}
    return record;
  }

  function completeRecord(recordOrId) {
    const all = rows();
    const idx = typeof recordOrId === 'string' ? all.findIndex(row => row.id === recordOrId) : all.findIndex(row => row.id === recordOrId?.id);
    const record = idx >= 0 ? all[idx] : recordOrId;
    if (!record) throw new Error('Scholarship record not found');
    const completed = {
      ...record,
      status: 'completed',
      summary: record.summary || `${record.title} - ${record.deadline ? `Deadline ${record.deadline}` : 'Details available'}`,
      checklist: [
        'Check eligibility from official source',
        'Prepare CNIC/passport and academic documents',
        'Apply before deadline',
        'Save application proof/screenshot'
      ],
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      all[idx] = completed;
      saveRows(all);
    }
    log({ type: 'completed', recordId: completed.id, title: completed.title });
    return completed;
  }

  function createWebsitePost(recordOrId) {
    const record = completeRecord(recordOrId);
    const slug = `${slugify(record.title)}-${record.id.toLowerCase()}`;
    const post = {
      id: `SP-${Date.now().toString(36).toUpperCase()}`,
      recordId: record.id,
      slug,
      title: record.title,
      summary: record.summary,
      localPath: `/scholarships/${slug}`,
      publicUrl: `${publicBaseUrl()}/scholarships/${slug}`,
      status: 'published_local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, `${slug}.html`), renderWebsiteHtml(post, record), 'utf8');
    savePosts([post, ...posts().filter(item => item.recordId !== record.id)]);
    const all = rows();
    const idx = all.findIndex(row => row.id === record.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: 'website_published', websitePostId: post.id, websiteUrl: post.publicUrl, updatedAt: new Date().toISOString() };
      saveRows(all);
    }
    log({ type: 'website_published', recordId: record.id, postId: post.id, url: post.publicUrl });
    return { post, record: idx >= 0 ? all[idx] : record };
  }

  function buildCaption(post = {}, record = {}) {
    const deadline = record.deadline ? `\nDeadline: ${record.deadline}` : '';
    const country = record.country ? `\nCountry: ${record.country}` : '';
    const levels = record.levels?.length ? `\nLevel: ${record.levels.join(', ')}` : '';
    return `🎓 Scholarship Alert\n\n${record.title || post.title}\n${country}${levels}${deadline}\n\nDetails + apply info:\n${post.publicUrl || record.websiteUrl || ''}\n\nVerify official details before applying.`;
  }

  function getRecord(id = '') {
    return rows().find(row => row.id === id || row.websitePostId === id) || null;
  }

  function getPost(idOrSlug = '') {
    return posts().find(post => post.id === idOrSlug || post.slug === idOrSlug || post.recordId === idOrSlug) || null;
  }

  function updateRecord(id = '', patch = {}) {
    const all = rows();
    const idx = all.findIndex(row => row.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    saveRows(all);
    return all[idx];
  }

  function summary() {
    const all = rows();
    return {
      enabled: settings().scholarship_pipeline_enabled !== false,
      total: all.length,
      captured: all.filter(row => row.status === 'captured').length,
      completed: all.filter(row => row.status === 'completed').length,
      websitePublished: all.filter(row => row.websiteUrl).length,
      sourceGroups: sourceGroups(),
      latest: all.slice(0, 10)
    };
  }

  return {
    ingestMessage,
    parseScholarship,
    completeRecord,
    createWebsitePost,
    buildCaption,
    getRecord,
    getPost,
    updateRecord,
    rows,
    posts,
    logs,
    summary,
    pagesDir,
    isAllowedSource
  };
}

module.exports = { createScholarshipPipeline, parseScholarship, looksLikeScholarship };
