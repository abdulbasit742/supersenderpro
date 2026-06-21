'use strict';
(function(){fetch('/api/dealer-portal/summary-preview?dealerId=dlr_demo1').then(r=>r.json()).then(j=>{document.getElementById('out').textContent=JSON.stringify(j,null,2);}).catch(e=>{document.getElementById('out').textContent=String(e);});}());
