#!/usr/bin/env node
'use strict';
var cp = require('child_process'), fs = require('fs'), path = require('path'), crypto = require('crypto'), http = require('http'), net = require('net');
var ROOT = path.join(__dirname, '..');
var G = '[32m', R = '[31m', Y = '[33m', B = '[34m', C = '[36m', W = '[1m', X = '[0m';
function ok(m)  { console.log(G+'[OK]  '+X+m); }
function er(m)  { console.log(R+'[ERR] '+X+m); }
function wn(m)  { console.log(Y+'[!]   '+X+m); }
function inf(m) { console.log(B+'[>]   '+X+m); }
function sep(m) { console.log(W+C+'\n'+('=').repeat(55)+'\n  '+m+'\n'+('=').repeat(55)+X); }
function sleep(ms) { return new Promise(function(r){setTimeout(r,ms);}); }
function getEnvVal(env, key) { var m = env.match(new RegExp(key+'=([^\n]*)'));return m?m[1].trim():''; }

var results = [];

async function step1_env() {
  sep('STEP 1/8: Environment & Secrets');
  var envPath = path.join(ROOT,'.env');
  var exPath  = path.join(ROOT,'.env.example');
  if (!fs.existsSync(envPath) && fs.existsSync(exPath)) { fs.copyFileSync(exPath, envPath); wn('.env created from .env.example'); }
  if (!fs.existsSync(envPath)) { er('.env missing!'); return { ok:false, notes:['.env not found'] }; }
  var env = fs.readFileSync(envPath,'utf8');
  var changed=false, fixed=[];
  var weak=[{k:'JWT_SECRET',v:'randomstring_change_this'},{k:'ENCRYPTION_KEY',v:'change_this_32_byte_secret'},{k:'SESSION_SECRET',v:'replace_with_a_strong_random_session_secret'},{k:'ADMIN_PASSWORD',v:'admin12345'},{k:'DB_PASSWORD',v:'strongpassword'}];
  weak.forEach(function(w){
    if(env.includes(w.k+'='+w.v)){
      env=env.replace(w.k+'='+w.v, w.k+'='+crypto.randomBytes(32).toString('hex'));
      changed=true; fixed.push(w.k);
    }
  });
  if(changed){ fs.writeFileSync(envPath,env); ok('Auto-hardened: '+fixed.join(', ')); }
  else ok('Secrets already customized');
  return { ok:true, notes: fixed.length ? ['Hardened: '+fixed.join(', ')] : ['All secrets OK'] };
}

async function step2_dirs() {
  sep('STEP 2/8: Directories & Data Files');
  var dirs = ['data','logs','uploads','exports','tmp','backups','ssl',
    'social-auto-posts/inbox','social-auto-posts/queued','social-auto-posts/posted','social-auto-posts/failed',
    'video-auto-posts/inbox','video-auto-posts/queued','video-auto-posts/posted',
    'public/assets/giveaways'];
  dirs.forEach(function(d){ fs.mkdirSync(path.join(ROOT,d),{recursive:true}); });
  var dataFiles = ['invoices.json','scheduled_messages.json','segments.json','renewals.json',
    'feedback.json','ai_reply_config.json','ai_reply_log.json','price_alerts.json',
    'wa_sessions.json','inbox_messages.json','inbox_contacts.json','quotes.json',
    'webhook_queue.json','webhook_endpoints.json','knowledge_base.json',
    'agent_missions.json','agent_executions.json','saas_billing.json'];
  var created=0;
  dataFiles.forEach(function(fn){
    var p=path.join(ROOT,'data',fn);
    if(!fs.existsSync(p)){
      var isObj = fn.includes('_contacts')||fn.includes('_sessions')||fn.includes('billing_stats');
      fs.writeFileSync(p, isObj ? '{}' : '[]');
      created++;
    }
  });
  ok('Directories ready. Data files initialized: '+created);
  return { ok:true, notes:[created+' files created'] };
}

async function step3_database() {
  sep('STEP 3/8: PostgreSQL & Redis');
  var notes=[];
  // Docker check
  var dockerOk=false;
  try { cp.execSync('docker --version',{stdio:'pipe'}); dockerOk=true; ok('Docker found'); } catch(e){ er('Docker not installed - get Docker Desktop from docker.com'); notes.push('Install Docker Desktop'); return {ok:false,notes}; }
  // Start containers
  var dbRunning=false;
  try { var out=cp.execSync('docker ps --format {{.Names}}',{stdio:'pipe'}).toString(); dbRunning=out.includes('supersender-db')||out.includes('db'); } catch(e){}
  if(!dbRunning){
    wn('Starting PostgreSQL + Redis containers...');
    try { cp.execSync('docker-compose up -d db redis',{stdio:'pipe',cwd:ROOT}); ok('DB + Redis started'); await sleep(4000); notes.push('DB started'); }
    catch(e){ er('docker-compose failed: '+e.message.slice(0,80)); notes.push('Manually run: docker-compose up -d db redis'); }
  } else { ok('PostgreSQL container running'); }
  // Prisma migrate
  var bDir=path.join(ROOT,'backend');
  if(fs.existsSync(path.join(bDir,'node_modules'))){
    try { cp.execSync('npx prisma migrate deploy',{stdio:'pipe',cwd:bDir}); ok('Prisma migrations applied'); }
    catch(e){ wn('Migration skipped (may need DB running first): '+e.message.slice(0,60)); notes.push('Run later: cd backend && npx prisma migrate deploy'); }
  } else { wn('Run: cd backend && npm install first'); notes.push('cd backend && npm install'); }
  // Redis check
  var redisOk=false;
  try { var ro=cp.execSync('docker ps --format {{.Names}}',{stdio:'pipe'}).toString(); redisOk=ro.includes('supersender-redis')||ro.includes('redis'); } catch(e){}
  if(redisOk) ok('Redis running'); else { wn('Redis not running'); notes.push('docker-compose up -d redis'); }
  return { ok: notes.filter(function(n){return n.startsWith('Manually');}).length===0, notes };
}

async function step4_whatsapp() {
  sep('STEP 4/8: WhatsApp Sessions');
  var authRoot=path.join(ROOT,'.baileys-auth');
  fs.mkdirSync(authRoot,{recursive:true});
  var sessions=['customer-bot','dealer-monitor','admin-alerts'];
  var notes=[];
  sessions.forEach(function(s){
    var p=path.join(authRoot,s);
    if(fs.existsSync(p)&&fs.readdirSync(p).length>0){ ok('Session '+s+' authenticated'); }
    else { wn('Session '+s+' needs QR scan'); notes.push('Scan: http://localhost:3001/api/whatsapp/qr/'+s); }
  });
  if(notes.length===0) return {ok:true,notes:['All sessions authenticated']};
  inf('After starting server, scan these QR codes:');
  notes.forEach(function(n){ inf('  '+n); });
  return {ok:false,notes};
}

async function step5_email() {
  sep('STEP 5/8: Email Parser (Gmail)');
  var envPath=path.join(ROOT,'.env');
  var env=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):'';
  var notes=[];
  var user=getEnvVal(env,'EMAIL_USER'), pass=getEnvVal(env,'EMAIL_PASSWORD');
  if(!user){ wn('EMAIL_USER not set'); notes.push('Set EMAIL_USER=yourstore@gmail.com in .env'); } else ok('EMAIL_USER: '+user);
  if(!pass){ wn('EMAIL_PASSWORD not set'); notes.push('Set EMAIL_PASSWORD=app-password in .env'); } else ok('EMAIL_PASSWORD configured');
  if(!user||!pass){
    inf('Gmail Setup:');
    inf('  1. Enable 2FA: myaccount.google.com/security');
    inf('  2. App Password: myaccount.google.com/apppasswords');
    inf('  3. Set EMAIL_USER + EMAIL_PASSWORD in .env');
    inf('  Full guide: scripts/setup-gmail.md');
  }
  return {ok:!notes.length,notes};
}

async function step6_payments() {
  sep('STEP 6/8: Payment Accounts');
  var envPath=path.join(ROOT,'.env');
  var env=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):'';
  var notes=[];
  var checks=[{k:'JAZZCASH_NUMBER',l:'JazzCash'},{k:'EASYPAISA_NUMBER',l:'EasyPaisa'},{k:'BANK_ACCOUNT',l:'Bank Account'}];
  checks.forEach(function(c){
    var v=getEnvVal(env,c.k);
    if(!v||v.includes('0000')||v.includes('XXXXXXX')){ wn(c.l+' not configured'); notes.push('Set '+c.k+' in .env'); }
    else ok(c.l+': '+v);
  });
  if(notes.length){ inf('Full guide: scripts/setup-payments.md'); }
  return {ok:!notes.length,notes};
}

async function step7_n8n() {
  sep('STEP 7/8: n8n Workflows');
  var wDir=path.join(ROOT,'n8n-workflows');
  var workflows=fs.existsSync(wDir)?fs.readdirSync(wDir).filter(function(f){return f.endsWith('.json');}):[];
  ok('Found '+workflows.length+' workflow files');
  var n8nUp=false;
  await new Promise(function(res){
    var req=http.get('http://localhost:5678/healthz',function(r){ n8nUp=r.statusCode<500; res(); });
    req.on('error',res); req.setTimeout(3000,function(){req.destroy();res();});
  });
  if(n8nUp){ ok('n8n running at http://localhost:5678'); inf('Import: Settings > Import Workflow > select files from n8n-workflows/'); }
  else {
    wn('n8n not running');
    inf('Start: docker-compose up -d n8n');
    inf('Auto-import: node scripts/import-n8n-workflows.js');
  }
  return {ok:n8nUp,notes:n8nUp?['n8n running, '+workflows.length+' workflows ready']:['Start n8n: docker-compose up -d n8n']};
}

async function step8_ssl() {
  sep('STEP 8/8: SSL / HTTPS');
  var sslDir=path.join(ROOT,'ssl');
  fs.mkdirSync(sslDir,{recursive:true});
  var cert=path.join(sslDir,'fullchain.pem'), key=path.join(sslDir,'privkey.pem');
  if(fs.existsSync(cert)&&fs.existsSync(key)){ ok('SSL certificates found'); return {ok:true,notes:['SSL ready']}; }
  wn('SSL certificates not found');
  try {
    cp.execSync('openssl req -x509 -newkey rsa:2048 -keyout '+key+' -out '+cert+' -days 365 -nodes -subj /CN=localhost',{stdio:'pipe'});
    ok('Self-signed certificate generated for local testing');
  } catch(e){
    wn('openssl not found for self-signed cert');
    inf('For production: bash scripts/ssl-setup.sh yourdomain.com you@email.com');
  }
  return {ok:fs.existsSync(cert),notes:['Production SSL: bash scripts/ssl-setup.sh domain.com email@example.com']};
}

async function main() {
  console.log(W+C+'\n'+'='.repeat(55)+X);
  console.log(W+C+'  SuperSender Pro -- Full Setup Wizard'+X);
  console.log(W+C+'='.repeat(55)+X);
  var steps = [step1_env, step2_dirs, step3_database, step4_whatsapp, step5_email, step6_payments, step7_n8n, step8_ssl];
  var results = [];
  for (var i=0; i<steps.length; i++) {
    try { var r=await steps[i](); results.push({ok:r.ok,notes:r.notes}); }
    catch(e) { results.push({ok:false,notes:[e.message]}); er('Step failed: '+e.message.slice(0,80)); }
  }
  sep('SETUP SUMMARY');
  var done=results.filter(function(r){return r.ok;}).length;
  results.forEach(function(r,i){
    console.log('  '+(r.ok?G+'[OK] '+X:Y+'[!]  '+X)+' Step '+(i+1)+': '+(r.notes[0]||''));
  });
  console.log(W+'\n  Score: '+done+'/'+results.length+' ('+Math.round(done/results.length*100)+'% ready)'+X);
  var reportFile = path.join(ROOT,'data','setup_report.json');
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});
  fs.writeFileSync(reportFile, JSON.stringify({generatedAt:new Date().toISOString(),score:done+'/'+results.length,steps:results},null,2));
  inf('Report saved: data/setup_report.json');
  inf('Setup dashboard: http://localhost:3001/setup-wizard.html');
  inf('Agent dashboard: http://localhost:3001/agent-dashboard.html');
  sep('NEXT STEPS');
  ['1. Fill .env: ADMIN_NUMBER, JAZZCASH_NUMBER, EASYPAISA_NUMBER, EMAIL_USER, EMAIL_PASSWORD',
   '2. docker-compose up -d',
   '3. cd backend && npx prisma migrate deploy',
   '4. node server.js',
   '5. Scan WhatsApp QR: http://localhost:3001/api/whatsapp/qr/customer-bot',
   '6. Import n8n: node scripts/import-n8n-workflows.js',
   '7. Open dashboard: http://localhost:3000',
   '8. Open agents: http://localhost:3001/agent-dashboard.html'].forEach(function(s){inf(s);});
}

main().catch(function(e){console.error(e);process.exit(1);});