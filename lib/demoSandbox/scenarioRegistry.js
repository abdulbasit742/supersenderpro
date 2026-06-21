'use strict';
const SCENARIOS = {
 ai_tools_reseller:{id:'ai_tools_reseller',title:'AI Tools Reseller Demo',description:'Sell AI tool subscriptions over WhatsApp with payment verification and renewals.',modulesUsed:['whatsapp','customers','orders','payments','kpis'],tourId:'whatsapp_automation',expectedOutcome:'See a reseller flow end-to-end with fake data.',recommendedPages:['/owner-command.html','/growth-campaigns.html']},
 ecommerce_store:{id:'ecommerce_store',title:'Ecommerce Store Demo',description:'Catalog, orders, payment reminders and channel posting.',modulesUsed:['ecommerce','orders','payments','whatsapp'],tourId:'growth_campaign',expectedOutcome:'Walk an ecommerce store through orders and offers.',recommendedPages:['/growth-campaigns.html']},
 whatsapp_channel_automation:{id:'whatsapp_channel_automation',title:'WhatsApp Channel Automation Demo',description:'Source ingest, approval queue, channel post drafts.',modulesUsed:['whatsapp'],tourId:'channel_automation',expectedOutcome:'See channel post drafts queued for approval.',recommendedPages:[]},
 customer_360_support:{id:'customer_360_support',title:'Customer 360 Support Demo',description:'Unified customer profile and follow-ups.',modulesUsed:['customers'],tourId:'customer_360',expectedOutcome:'Browse a fake customer 360 view.',recommendedPages:[]},
 voice_ai_reply:{id:'voice_ai_reply',title:'Voice AI Reply Demo',description:'Fake transcript and voice reply draft.',modulesUsed:['voiceAI'],tourId:'voice_ai',expectedOutcome:'Read a voice transcript and draft.',recommendedPages:[]},
 growth_campaign:{id:'growth_campaign',title:'Growth Campaign Demo',description:'Plan a flash sale and draft content.',modulesUsed:['whatsapp','ecommerce','kpis'],tourId:'growth_campaign',expectedOutcome:'See a campaign drafted dry-run.',recommendedPages:['/growth-campaigns.html']}
};
function list(){return Object.values(SCENARIOS).map(({id,title,description,modulesUsed})=>({id,title,description,modulesUsed}));}
function get(id){return SCENARIOS[id]||null;}
module.exports={SCENARIOS,list,get};
