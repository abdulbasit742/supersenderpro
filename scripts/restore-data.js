#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const DATA=path.join(ROOT,'data'),BKP=path.join(ROOT,'backups');
function copyDir(src,dest){const st=fs.statSync(src);if(st.isDirectory()){fs.mkdirSync(dest,{recursive:true});for(const e of fs.readdirSync(src))copyDir(path.join(src,e),path.join(dest,e));}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);}}
function listBackups(){if(!fs.existsSync(BKP))return[];return fs.readdirSync(BKP).filter(n=>n.startsWith('data-')).map(n=>({name:n,full:path.join(BKP,n),t:fs.statSync(path.join(BKP,n)).mtimeMs})).sort((a,b)=>b.t-a.t);}
function restoreBackup(arg){
  if(arg==='--list'||!arg){const items=listBackups();if(!items.length){console.log('No backups found.');return null;}items.forEach((b,i)=>console.log(i+1+'. '+b.name));if(!arg)return null;}
  const backups=listBackups();
  const dir=/^d+$/.test(arg)?backups[Number(arg)-1]&&backups[Number(arg)-1].full:path.resolve(arg);
  if(!dir||!fs.existsSync(dir))throw new Error('Backup not found: '+arg);
  const src=path.join(dir,'data');
  if(!fs.existsSync(src))throw new Error('Backup has no data/ dir: '+dir);
  const snap=path.join(BKP,'pre-restore-'+Date.now());
  if(fs.existsSync(DATA)){copyDir(DATA,path.join(snap,'data'));console.log('Safety snapshot: '+snap);}
  fs.rmSync(DATA,{recursive:true,force:true});
  copyDir(src,DATA);
  console.log('Restored from: '+dir);
  return{dir,snap};
}
if(require.main===module)restoreBackup(process.argv[2]);
module.exports={listBackups,restoreBackup};
