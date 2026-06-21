// lib/platformControl/queueReadiness.js — queue/worker/redis presence, no live queue mutation.
 'use strict';
 const cfg = require('./config');


 function queueReadiness() {
     const keys = cfg.envKeyNames();
     const pkg = cfg.readJSON('package.json') || {};
     const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
     return cfg.base({
       liveQueueMutation: false,
       redisConfiguredPreview: keys.includes('REDIS_URL') || keys.includes('REDIS_HOST'),
       queueAdapterAvailablePreview: !!(deps.bullmq || deps.bull || deps['bee-queue']) || cfg.hasFile([/queue|bull|bee/i]),
       workerDetectedPreview: cfg.hasFile([/worker/i]),
       schedulerDetectedPreview: cfg.hasFile([/scheduler|cron/i]),
       deadLetterDetectedPreview: cfg.hasFile([/dead.?letter|retry/i]),
       inMemoryFallbackAvailablePreview: true,
     });
 }


 module.exports = { queueReadiness };
