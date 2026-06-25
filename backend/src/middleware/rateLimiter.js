function createRateLimiter(options = {}) {
  try {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000,
      max: options.max || 100,
      message: options.message || { error: 'Too many requests. Please try again later.' },
      standardHeaders: true, legacyHeaders: false,
      skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
      ...options
    });
  } catch { return (req, res, next) => next(); }
}

const apiLimiter     = createRateLimiter({ windowMs: 15*60*1000, max: 200 });
const authLimiter    = createRateLimiter({ windowMs: 15*60*1000, max: 20,  message: { error: 'Too many login attempts. Try again in 15 minutes.' } });
const paymentLimiter = createRateLimiter({ windowMs: 60*1000,    max: 10  });
const broadcastLimiter = createRateLimiter({ windowMs: 60*60*1000, max: 5 });

module.exports = { createRateLimiter, apiLimiter, authLimiter, paymentLimiter, broadcastLimiter };
