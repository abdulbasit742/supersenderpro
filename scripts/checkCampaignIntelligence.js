#!/usr/bin/env node
'use strict';
const ci = require('../lib/campaignIntelligence');
const out = ci.getCampaignIntelligenceStatus();
if (!out || out.ok !== true || out.liveActionsEnabled !== false || out.liveSend !== false) throw new Error('campaign intelligence safety check failed');
console.log(JSON.stringify({ ok:true, module:'campaign-intelligence', dryRun:out.dryRun, analyticsOnly:out.analyticsOnly }, null, 2));
