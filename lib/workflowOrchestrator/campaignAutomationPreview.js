'use strict';
const cfg=require('./config'); const { rateLimitGuard }=require('./rateLimitGuard'); const { maskMessage }=require('./redactor');
function campaignAutomationPreview(input){ const i=input||{}; const audience=Math.max(0,Number(i.audienceCount)||0); return cfg.base({ liveCampaignMutation:false, liveSend:false, campaignDraftPreview:{ name:i.name||'Follow-up Preview', messagePreview:maskMessage(i.message||'Follow-up draft preview') }, audienceCountPreview:audience, rateLimitPlanPreview:rateLimitGuard({audienceCount:audience,perMinute:i.perMinute}).rateLimitPlanPreview }); }
module.exports={ campaignAutomationPreview };
