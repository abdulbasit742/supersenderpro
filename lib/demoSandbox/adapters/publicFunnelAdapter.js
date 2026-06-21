'use strict';
const fs = require('fs'); const path = require('path');
const CTAS = ['/landing.html','/pricing.html','/start.html'];
function funnelPresent(){ return fs.existsSync(path.join(process.cwd(),'routes/publicSaasFunnelRoutes.js')); }
function status(){ return { available:funnelPresent(), ctas:CTAS, note:funnelPresent() ? 'Funnel present; CTAs can route to public pages.' : 'Funnel unavailable; CTAs show fallback.' }; }
module.exports = { funnelPresent, status };
