const os = require('os');
const stats = { requests: 0, errors: 0, totalResponseTime: 0, slowRequests: 0, startTime: Date.now() };
const SLOW_REQUEST_THRESHOLD_MS = 1000;

function performanceMiddleware(req, res, next) {
  const start = Date.now();
  stats.requests++;
  const originalSend = res.send.bind(res);
  res.send = function(body) {
    const duration = Date.now() - start;
    stats.totalResponseTime += duration;
    if (res.statusCode >= 400) stats.errors++;
    if (duration > SLOW_REQUEST_THRESHOLD_MS) {
      stats.slowRequests++;
      console.warn('[SLOW] ' + req.method + ' ' + req.path + ' - ' + duration + 'ms');
    }
    res.set('X-Response-Time', duration + 'ms');
    return originalSend(body);
  };
  next();
}

function getStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  return {
    requests: stats.requests,
    errors: stats.errors,
    errorRate: stats.requests > 0 ? ((stats.errors / stats.requests) * 100).toFixed(2) + '%' : '0%',
    avgResponseTime: stats.requests > 0 ? Math.round(stats.totalResponseTime / stats.requests) + 'ms' : '0ms',
    slowRequests: stats.slowRequests,
    uptime: uptime + 's',
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    cpu: os.loadavg()[0].toFixed(2),
  };
}

function resetStats() { Object.assign(stats, { requests: 0, errors: 0, totalResponseTime: 0, slowRequests: 0, startTime: Date.now() }); }

module.exports = { performanceMiddleware, getStats, resetStats };