#!/usr/bin/env node
const http=require('http');
const BASE=process.env.BASE_URL||'http://localhost:3001';
const CONC=Number(process.env.CONCURRENCY||10);
const REQS=Number(process.env.REQUESTS||100);
const PATHS=['/api/health','/api/monitoring/health','/api/monitoring/info'];
function req(p){const s=Date.now();return new Promise(res=>{const r=http.get(BASE+p,resp=>{resp.resume();resp.on('end',()=>res({ok:resp.statusCode<500,status:resp.statusCode,ms:Date.now()-s,p}));});r.setTimeout(10000,()=>r.destroy(new Error('timeout')));r.on('error',e=>res({ok:false,status:0,ms:Date.now()-s,p,error:e.message}));});}
async function run(){
  console.log('Load test: '+BASE+' | reqs:'+REQS+' conc:'+CONC);
  const results=[];let next=0;
  async function worker(){while(next<REQS){const id=next++;results.push(await req(PATHS[id%PATHS.length]));}}
  const t=Date.now();await Promise.all(Array.from({length:CONC},worker));const ms=Date.now()-t;
  const ok=results.filter(r=>r.ok).length;
  const times=results.map(r=>r.ms).sort((a,b)=>a-b);
  const avg=Math.round(times.reduce((a,b)=>a+b,0)/(times.length||1));
  const p95=times[Math.floor(times.length*.95)]||0;
  console.log('Total: '+ms+'ms | ok:'+ok+'/'+results.length+' | avg:'+avg+'ms | p95:'+p95+'ms');
  if(ok!==results.length)process.exitCode=1;
}
if(require.main===module)run();
module.exports={run};
