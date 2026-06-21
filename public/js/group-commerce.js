 // public/js/group-commerce.js - vanilla JS, talks to /api/group-commerce/*.
 (function () {
   'use strict';
   var API = '/api/group-commerce';
   var currentId = null;
   function $(id){return document.getElementById(id);}
   function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&','<':'<','>':'>'}[c];});}
   function api(m,p,b){return fetch(API+p,{method:m,headers:{'Content-Type':'application/json'},body:b?
 JSON.stringify(b):undefined}).then(function(r){return r.json().catch(function(){return {ok:false,error:'bad\n json'};});});}


  function loadStatus(){ api('GET','/status').then(function(r){ if(r.ok){ $('gc-mode').textContent = r.dryRun ? 'DRY-RUN'
: 'LIVE'; } loadAgents(r.agents||[]); }); }
  function loadAgents(list){ $('gc-agents').innerHTML = (list||[]).map(function(a){ return '<div class="gc-row"\nstyle="justify-content:space-between"><span>'+esc(a)+'</span><button class="gc-btn secondary" data-\nagent="'+a+'">assign</button></div>'; }).join(''); Array.prototype.forEach.call($('gc-\nagents').querySelectorAll('button[data-agent]'),function(b){ b.addEventListener('click',function(){ if(!currentId)return;
api('POST','/groups/'+currentId+'/agents',{agent:b.getAttribute('data-agent'),enabled:true}).then(function(){
b.textContent='assigned'; }); }); }); }

  function loadGroups(){ return api('GET','/groups').then(function(r){ var ul=$('gc-groups'); if(!r.ok)
{ul.innerHTML='<li>'+esc(r.error)+'</li>';return;} if(!r.groups.length){ul.innerHTML='<li class="gc-muted">No groups\nyet</li>';return;} ul.innerHTML=r.groups.map(function(g){return '<li data-id="'+g.groupId+'"><span><span class="gc-dot '+
(g.commerceMode?'on':'off')+'"></span>'+esc(g.groupName)+'</span></li>';}).join('');
Array.prototype.forEach.call(ul.querySelectorAll('li[data-id]'),function(li){li.addEventListener('click',function()
{selectGroup(li.getAttribute('data-id'));});}); }); }


  function selectGroup(id){ currentId=id; Array.prototype.forEach.call(document.querySelectorAll('#gc-groups\nli'),function(li){li.classList.toggle('active',li.getAttribute('data-id')===id);});
api('GET','/groups/'+id+'/catalog').then(function(r){ $('gc-catalog').textContent = r.ok ? (r.draft.draft||'(empty)') :
r.error; }); }


  function add(){ var name=$('gc-new-name').value.trim(); if(!name)return; api('POST','/groups',
{groupName:name}).then(function(){ $('gc-new-name').value=''; loadGroups(); }); }

  function analyze(){ var msg=$('gc-msg').value; api('POST','/groups/'+(currentId||'none')+'/analyze-message',
{message:msg,banLinks:true}).then(function(r){ $('gc-analysis').textContent = JSON.stringify(r.ok?
{analysis:r.analysis,moderation:r.moderation}:r,null,2); }); }


  function runCmd(){ if(!currentId){ $('gc-cmd-out').textContent='Select a group first.'; return; }
api('POST','/groups/'+currentId+'/command',{text:$('gc-cmd').value,fromNumber:$('gc-admin').value}).then(function(r){
$('gc-cmd-out').textContent=JSON.stringify(r.result||r,null,2); }); }


  function pause(min){ if(!currentId)return; api('POST','/groups/'+currentId+'/pause',{minutes:min,scope:
['ai']}).then(function(r){ $('gc-pause-state').textContent = r.ok?('Paused '+r.minutes+'m'):(r.error||''); }); }
  function resume(){ if(!currentId)return; api('POST','/groups/'+currentId+'/resume',{}).then(function(){ $('gc-pause-\nstate').textContent='Resumed'; }); }


  document.addEventListener('DOMContentLoaded',function(){
    loadStatus(); loadGroups();
    $('gc-refresh').addEventListener('click',function(){loadStatus();loadGroups();});
    $('gc-add').addEventListener('click',add);
    $('gc-analyze').addEventListener('click',analyze);
    $('gc-run-cmd').addEventListener('click',runCmd);
    $('gc-resume').addEventListener('click',resume);
    Array.prototype.forEach.call(document.querySelectorAll('button[data-pause]'),function(b)
{b.addEventListener('click',function(){pause(Number(b.getAttribute('data-pause')));});});
  });
})();
