#!/usr/bin/env node
'use strict';
const l=require('../../lib/publicSaasFunnel/leadCapture'); console.log(JSON.stringify(l.demo({name:'Demo',email:'demo@example.test',consent:true})));
