// lib/videoAI/index.js — Barrel export for the Video AI module.

module.exports = {
 config: require('./config').config,
 providerRegistry: require('./providerRegistry'),
 videoEngine: require('./videoEngine'),
 providers: require('./providers'),
};
