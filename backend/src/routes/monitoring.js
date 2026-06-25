const express = require('express');
const os = require('os');
const router = express.Router();

router.get('/health', (req, res) => {
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: Math.floor(uptime), uptimeFormatted: formatUptime(uptime), version: process.env.npm_package_version||'1.0.0', environment: process.env.NODE_ENV||'development', memory: { heapUsed: Math.round(mem.heapUsed/1024/1024)+'MB', heapTotal: Math.round(mem.heapTotal/1024/1024)+'MB', rss: Math.round(mem.rss/1024/1024)+'MB' }, system: { platform: os.platform(), arch: os.arch(), nodeVersion: process.version, cpus: os.cpus().length, freeMemory: Math.round(os.freemem()/1024/1024)+'MB', totalMemory: Math.round(os.totalmem()/1024/1024)+'MB' }, services: { database: { configured: !!(process.env.DATABASE_URL), provider: (process.env.DATABASE_URL||'').startsWith('postgresql') ? 'PostgreSQL' : 'SQLite' }, redis: { configured: !!(process.env.REDIS_URL) }, whatsapp: { session: process.env.WA_CUSTOMER_SESSION||'customer-bot' }, sentry: { configured: !!(process.env.SENTRY_DSN) } } });
});

router.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.set('Content-Type', 'text/plain');
  let out = '';
  out += 'supersender_uptime_seconds ' + Math.floor(process.uptime()) + os.EOL;
  out += 'supersender_memory_heap_used_bytes ' + mem.heapUsed + os.EOL;
  out += 'supersender_memory_rss_bytes ' + mem.rss + os.EOL;
  res.send(out);
});

router.get('/info', (req, res) => {
  res.json({ app: 'SuperSender Pro', version: process.env.npm_package_version||'1.0.0', description: 'AI Tools Business Command Center', environment: process.env.NODE_ENV||'development', nodeVersion: process.version, platform: process.platform, pid: process.pid, startedAt: new Date(Date.now()-process.uptime()*1000).toISOString() });
});

function formatUptime(s) { const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=Math.floor(s%60); return d+'d '+h+'h '+m+'m '+sec+'s'; }

module.exports = router;