const env = require('../config/env');
const { verifyPaymentNotification } = require('../payment/verifier');

let Bull = null;
try {
  Bull = require('bull');
} catch {
  Bull = null;
}

let queue = null;

function getPaymentQueue() {
  if (!Bull) return null;
  if (!queue) {
    queue = new Bull('payment-verification', env.redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 500,
        removeOnFail: 500
      }
    });
  }
  return queue;
}

function startPaymentQueue(io) {
  const q = getPaymentQueue();
  if (!q) {
    console.warn('[paymentQueue] Bull is not installed; payment jobs run inline.');
    return { started: false, inline: true };
  }
  q.process('payment_notification', async (job) => {
    const result = await verifyPaymentNotification(job.data);
    io?.emit('payment:verified', result);
    return result;
  });
  q.on('failed', (job, error) => console.error('[paymentQueue:failed]', job?.id, error));
  q.on('completed', (job) => console.log('[paymentQueue:completed]', job.id));
  return { started: true };
}

async function enqueuePaymentNotification(payload, io) {
  const q = getPaymentQueue();
  if (!q) {
    const result = await verifyPaymentNotification(payload);
    io?.emit('payment:verified', result);
    return result;
  }
  return q.add('payment_notification', payload);
}

module.exports = {
  getPaymentQueue,
  startPaymentQueue,
  enqueuePaymentNotification
};
