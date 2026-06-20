// lib/templateMarketplace/installHistory.js — Records preview/install events (local, redacted).
'use strict';
const { paths }=require('./config');
const { readJSON, appendHistory }=require('./store');
function record(entry){ appendHistory(paths.history,{ type:'install_event', ...entry }); return true; }
function list(limit=100){ return readJSON(paths.history,[]).filter(e=>e&&(e.type==='install_event'||e.type==='blueprint_preview')).slice(0,limit); }
module.exports={ record, list };
