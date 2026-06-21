#!/usr/bin/env node
'use strict';
const pc = require('../lib/platformControl');
const out = pc.getPlatformControlStatus();
if (!out || out.ok !== true || out.liveActionsEnabled !== false || out.externalCallsEnabled !== false) throw new Error('platform control safety check failed');
console.log(JSON.stringify({ ok:true, module:'platform-control', dryRun:out.dryRun, readOnly:out.readOnly }, null, 2));
