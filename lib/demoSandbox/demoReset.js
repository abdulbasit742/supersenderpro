'use strict';
const path = require('path'); const store = require('./store');
function tryRequire(rels){ for(const r of rels){ try{return require(path.resolve(process.cwd(),r));}catch(e){} } return null; }
const existingDemoMode = tryRequire(['src/modules/demoMode']);
function reset(opts){ const s=store.emptyState(); store.save(s); let demoModeReset=false; if(opts && opts.includeDemoModeFiles && existingDemoMode && typeof existingDemoMode.isDemoMode==='function' && existingDemoMode.isDemoMode()){ try{ existingDemoMode.reset(); demoModeReset=true; }catch(e){} } store.appendHistory({kind:'demo_reset',demoModeReset}); return {ok:true,reset:true,demoModeFilesReset:demoModeReset,note:'Sandbox state cleared. Real module data untouched.'}; }
module.exports = { reset };
