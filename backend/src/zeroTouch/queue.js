const env = require('../config/env');
const { runZeroTouchJob } = require('./engine');

let Bull = null;
try {
  Bull = require('bull');
} catch {
  Bull = null;
}

let queue = null;
let started = false;

function getZeroTouchQueue() {
  if (!env.zeroTouchEnableBull) return null;
  if (!Bull) return null;
  if (!queue) {
    queue = new Bull('zero-touch-order-engine', env.redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 15000 },
        removeOnComplete: 500,
        removeOnFail: 500
      }
    });
    queue.on('error', (error) => console.error('[zeroTouchQueue:error]', error.message));
    queue.on('failed', (job, error) => console.error('[zeroTouchQueue:failed]', job?.id, job?.data?.type, error.message));
    queue.on('completed', (job) => console.log('[zeroTouchQueue:completed]', job.id, job.data?.type));
  }
  return queue;
}

function startZeroTouchQueue(io) {
  const q = getZeroTouchQueue();
  if (!q) {
    console.warn('[zeroTouchQueue] Bull is not installed; Zero-Touch jobs run inline.');
    return { started: false, inline: true };
  }
  if (started) return { started: true, reused: true };
  q.process(async (job) => {
    const { type, payload } = job.data || {};
    return runZeroTouchJob(type, payload || {}, io);
  });
  started = true;
  return { started: true };
}

async function enqueueZeroTouchJob(type, payload = {}, options = {}, io = null) {
  const q = getZeroTouchQueue();
  if (!q) return runZeroTouchJob(type, payload, io);
  try {
    return await q.add({ type, payload }, options);
  } catch (error) {
    console.error('[zeroTouchQueue:add]', error);
    return runZeroTouchJob(type, payload, io);
  }
}

module.exports = {
  getZeroTouchQueue,
  startZeroTouchQueue,
  enqueueZeroTouchJob
};
