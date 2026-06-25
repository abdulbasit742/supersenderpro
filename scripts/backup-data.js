const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const DATA=path.join(ROOT,'data'),BKP=path.join(ROOT,'backups');
const KEEP=Number(process.env.BACKUP_RETENTION||7);
function pad(n){return String(n).padStart(2,'0');}
function stamp(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'-'+pad(d.getHours())+'-'+pad(d.getMinutes());}
function fmtSize(b){return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB';}
function copyDir(src,dest,s){if(!fs.existsSync(src))return;const st=fs.statSync(src);if(st.isDirectory()){fs.mkdirSync(dest,{recursive:true});for(const e of fs.readdirSync(src))copyDir(path.join(src,e),path.join(dest,e),s||{});}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);if(s){s.files++;s.bytes+=st.size;}}}
function maskEnv(raw){var lines=raw.split(String.fromCharCode(10));var r=lines.map(function(line){var t=line.trim();if(!t||t.indexOf('#')===0||t.indexOf('=')<0)return line;var idx=line.indexOf('=');var key=line.slice(0,idx).trim();var val=line.slice(idx+1);if(!val)return key+'=';var safe=['NODE_ENV','PORT','FRONTEND_URL','BOT_NAME','JWT_EXPIRES_IN','BCRYPT_ROUNDS'];return safe.indexOf(key)>=0?line:key+'=***';});return r.join(String.fromCharCode(10));}
function prune(){if(!fs.existsSync(BKP))return 0;var items=fs.readdirSync(BKP).filter(function(n){return n.indexOf('data-')===0;}).map(function(n){return{n:n,f:path.join(BKP,n),t:fs.statSync(path.join(BKP,n)).mtimeMs};}).sort(function(a,b){return b.t-a.t;});var removed=0;items.slice(KEEP).forEach(function(i){try{fs.rmSync(i.f,{recursive:true,force:true});removed++;}catch(e){}});return removed;}
function createBackup(){
  fs.mkdirSync(BKP,{recursive:true});
  var dir=path.join(BKP,'data-'+stamp());
  var s={files:0,bytes:0};
  fs.mkdirSync(dir,{recursive:true});
  if(fs.existsSync(DATA))copyDir(DATA,path.join(dir,'data'),s);
  var envP=path.join(ROOT,'.env');
  if(fs.existsSync(envP)){var m=maskEnv(fs.readFileSync(envP,'utf8'));fs.writeFileSync(path.join(dir,'env.masked'),m);s.files++;s.bytes+=Buffer.byteLength(m);}
  fs.writeFileSync(path.join(dir,'backup-summary.json'),JSON.stringify({createdAt:new Date().toISOString(),files:s.files,bytes:s.bytes,dir:dir},null,2));
  var pruned=prune();
  console.log('Backup: '+dir);console.log('Files: '+s.files+', Size: '+fmtSize(s.bytes));
  if(pruned)console.log('Pruned: '+pruned+' old backups');
  return{dir:dir,files:s.files,bytes:s.bytes};
}
if(require.main===module)createBackup();
module.exports={createBackup:createBackup,maskEnv:maskEnv,fmtSize:fmtSize};