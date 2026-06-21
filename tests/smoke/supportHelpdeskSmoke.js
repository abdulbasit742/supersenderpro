#!/usr/bin/env node
'use strict';
const t=require('../../lib/supportHelpdesk/ticketRegistry'); const r=t.create({title:'Bug',description:'error',consentOk:true}); console.log(JSON.stringify({ok:r.ok,category:r.ticket.category,dryRun:r.ticket.dryRun}));
