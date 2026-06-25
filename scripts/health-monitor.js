#!/usr/bin/env node
const http=require('http');
const URL=process.env.HEALTH_URL||'http://localhost:3001/api/health';
const IV=Number(process.env.HEALTH_CHECK_INTERVAL||30000);
let fails=0;
function check(){
  const req=http.get(URL,res=>{res.resume();if(res.statusCode===200){fails=0;console.log('['+new Date().toISOString()+'] OK');}else handleFail('HTTP '+res.statusCode);});
  req.setTimeout(8000,()=>req.destroy(new Error('timeout')));
  req.on('error',err=>handleFail(err.message));
}
function handleFail(reason){fails++;console.error('['+new Date().toISOString()+'] DOWN: '+reason+' (fails:'+fails+')');if(fails>=3)console.error('ALERT: Server down 3+ checks!');}
console.log('Health monitor started -> '+URL+' every '+(IV/1000)+'s');
check();setInterval(check,IV);
