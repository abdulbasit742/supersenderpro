#!/usr/bin/env node
'use strict';
const s=require('../../lib/demoSandbox/scenarioRunner'); console.log(JSON.stringify(s.start('ai_tools_reseller')).slice(0,500));
