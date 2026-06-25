const pino = require('pino');

let transport;
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  try {
    require.resolve('pino-pretty');
    transport = { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } };
  } catch (_) {
    transport = undefined;
  }
}

const logger = pino({ level: process.env.LOG_LEVEL || 'info', transport });

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]({ method: req.method, url: req.originalUrl, status: res.statusCode, duration: duration + 'ms', ip: req.ip || req.connection.remoteAddress });
  });
  next();
}

module.exports = { requestLogger, logger };