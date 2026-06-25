let captureError = () => {};
try { ({ captureError } = require('../monitoring/sentry')); } catch {}

function errorHandler(err, req, res, next) {
  const errorId = Date.now().toString(36);
  console.error('[ERROR ' + errorId + '] ' + req.method + ' ' + req.path + ':', err.message);
  captureError(err, { path: req.path, method: req.method, errorId });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Duplicate entry', code: 'DUPLICATE' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found', code: 'NOT_FOUND' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  if (err.name === 'UnauthorizedError') return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal server error' : err.message;
  res.status(statusCode).json({ error: message, errorId, code: err.code || 'INTERNAL_ERROR' });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Route ' + req.method + ' ' + req.path + ' not found', code: 'NOT_FOUND' });
}

module.exports = { errorHandler, notFound };
