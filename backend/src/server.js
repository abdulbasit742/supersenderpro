const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const env = require('./config/env');
const prisma = require('./services/prisma');
const { scheduleAll } = require('./bot/scheduler/cron');
const { startPaymentEmailWatcher } = require('./payment/emailParser');
const { startPaymentQueue } = require('./queues/paymentQueue');

// ── Monitoring, Error Handling, Swagger ──────────────────────────────────────
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require("./monitoring/sentry");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { authLimiter, paymentLimiter } = require("./middleware/rateLimiter");
const { performanceMiddleware } = require("./middleware/performance");
const { requestLogger } = require("./middleware/requestLogger");
const monitoringRouter = require("./routes/monitoring");
let rateLimit = null;
try {
  rateLimit = require('express-rate-limit');
} catch {
  rateLimit = null;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: '/ws',
  cors: { origin: env.frontendUrl, credentials: true }
});

app.set('io', io);

initSentry(app);
app.use(sentryRequestHandler());
app.use(requestLogger);
app.use(performanceMiddleware);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: [env.frontendUrl, 'http://127.0.0.1:3000', 'http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
if (rateLimit) {
  app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false
  }));
} else {
  console.warn('[server] express-rate-limit is not installed; API rate limiting is disabled.');
}

app.use('/api/monitoring', monitoringRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'AI Tools Subscription Business System',
    time: new Date().toISOString(),
    modules: ['rates', 'profit', 'dealers', 'whatsapp', 'stock', 'analytics', 'sheets', 'payment-email-parser', 'redis-queue', 'zero-touch-order-engine']
  });
});

app.get('/qr', (req, res) => {
  res.redirect('/api/whatsapp/qr/customer-bot');
});

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/dealers', require('./routes/dealers'));
app.use('/api/rates', require('./routes/rates'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/broadcast', require('./routes/broadcast'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/business', require('./routes/business'));
app.use('/api/dealer-intelligence', require('./routes/dealer-intelligence'));
app.use('/api/n8n', require('./routes/n8n'));
app.use('/api/payments', paymentLimiter, require('./routes/payments'));
app.use('/api/zero-touch', require('./routes/zero-touch'));
app.use('/api/wati', require('./routes/wati'));
app.use('/webhook/n8n', require('./routes/n8n'));

io.on('connection', (socket) => {
  socket.emit('system:ready', { time: new Date().toISOString() });
});

scheduleAll(io);
startPaymentQueue(io);
startPaymentEmailWatcher(io);

app.use(sentryErrorHandler());
app.use(notFound);
app.use((err, req, res, next) => {
  console.error('[api:error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function main() {
  await prisma.$connect();
  server.listen(env.port, () => {
    console.log('AI Tools backend listening on http://127.0.0.1:' + env.port);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});