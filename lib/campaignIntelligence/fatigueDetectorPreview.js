'use strict';
const cfg=require('./config');
function fatigueDetector(input){ const i=input||{}; const sendsLast7d=Math.max(0,Number(i.sendsLast7d)||0); const level=sendsLast7d>=5?'high_preview':sendsLast7d>=3?'medium_preview':'low_preview'; return cfg.base({ fatigueLevelPreview:level, sendsLast7dPreview:sendsLast7d, recommendationsPreview: level==='high_preview'?['Pause non-essential sends; you are over-messaging this audience.']:(level==='medium_preview'?['Reduce send frequency for this segment.']:[]) }); }
module.exports={ fatigueDetector };
