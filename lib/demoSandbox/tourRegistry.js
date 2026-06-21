'use strict';
function step(id,page,selector,title,description,nextStepId,moduleId,optional){return {id,page,selector,title,description,actionHint:'Click Next to continue',nextStepId:nextStepId||null,optional:!!optional,moduleId:moduleId||null};}
const TOURS={
 full_product:{id:'full_product',title:'Full Product Tour',steps:[step('fp1','/demo-sandbox.html','#bs-overview','Welcome','This is SuperSender Pro in demo mode. Everything here is fake and safe.','fp2'),step('fp2','/demo-sandbox.html','.gc-tabs','Scenarios','Pick a scenario to load a realistic demo.',null)]},
 business_owner:{id:'business_owner',title:'Business Owner Tour',steps:[step('bo1','/owner-command.html',null,'Daily briefing','See what needs your attention today.',null,'ownerCommand')]},
 whatsapp_automation:{id:'whatsapp_automation',title:'WhatsApp Automation Tour',steps:[step('wa1','/demo-sandbox.html',null,'Fake chats','Preview WhatsApp chats with demo data.',null,'whatsapp')]},
 channel_automation:{id:'channel_automation',title:'Channel Automation Tour',steps:[step('ca1','/demo-sandbox.html',null,'Channel drafts','See channel post drafts queued for approval.',null,'whatsapp')]},
 growth_campaign:{id:'growth_campaign',title:'Growth Campaign Tour',steps:[step('gc1','/growth-campaigns.html',null,'Campaign draft','Preview a safe campaign draft.',null,'growth')]},
 customer_360:{id:'customer_360',title:'Customer 360 Tour',steps:[step('c1','/demo-sandbox.html',null,'Customer preview','Masked customer data only.',null,'customer360')]},
 voice_ai:{id:'voice_ai',title:'Voice AI Tour',steps:[step('v1','/demo-sandbox.html',null,'Voice draft','No audio, just script preview.',null,'voiceAI')]},
 saas_billing:{id:'saas_billing',title:'SaaS Billing Tour',steps:[step('s1','/demo-sandbox.html',null,'Billing preview','Fake plans and invoice drafts.',null,'billing')]}
};
function list(){return Object.values(TOURS).map((t)=>({id:t.id,title:t.title,steps:t.steps.length}));}
function get(id){return TOURS[id]||null;}
module.exports={TOURS,list,get};
