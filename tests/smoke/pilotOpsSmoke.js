#!/usr/bin/env node
'use strict';
const registry=require('../../lib/pilotOps/pilotRegistry'); const p=registry.create({businessName:'Demo',consentGiven:true}); console.log(JSON.stringify({ok:!!p.id,dryRun:p.dryRun}));
