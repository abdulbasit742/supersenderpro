#!/usr/bin/env node
'use strict';
const r=require('../../lib/resellerPortal/resellerRegistry'); const x=r.create({companyName:'Demo Agency',partnerTier:'agency_partner'}); console.log(JSON.stringify({ok:x.ok,dryRun:x.reseller.dryRun}));
