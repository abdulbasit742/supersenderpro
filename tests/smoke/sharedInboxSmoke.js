#!/usr/bin/env node
'use strict';
const r=require('../../lib/sharedInbox/replyPreview'); console.log(JSON.stringify(r.build({to:'+15550123',text:'hello'})));
