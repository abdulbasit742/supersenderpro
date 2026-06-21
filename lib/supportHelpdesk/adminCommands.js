'use strict';
const tickets = require('./ticketRegistry');
const kb = require('./knowledgeBase');
const drafts = require('./supportDrafts');
const handlers = {
  '!tickets': () => { const list = tickets.list(); return list.length ? list.slice(0,10).map((x)=>`${x.id}: ${x.title} (${x.priority}/${x.status})`).join('\n') : 'Koi ticket nahi.'; },
  '!ticket': (a) => { const t=tickets.get(a[0]); return t ? `${t.title}\n${t.category}/${t.priority}/${t.status}` : 'Ticket nahi mila.'; },
  '!supportdraft': (a) => { const t=tickets.get(a[0]); return t ? drafts.build(t,{language:'roman_urdu'}).shortReply : 'Ticket nahi mila.'; },
  '!kbsearch': (a) => kb.search((a||[]).join(' '), { limit: 3 }).map((x)=>x.article.title).join('\n') || 'Kuch nahi mila.',
  '!supportdoctor': () => `Tickets: ${tickets.list().length}, KB: ${kb.list().length}, live replies: off`,
};
function handle(cmd,args){const fn=handlers[cmd]; return fn ? fn(args||[]) : null;}
module.exports = { handlers, handle };
