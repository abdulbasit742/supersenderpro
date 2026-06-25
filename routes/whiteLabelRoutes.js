// routes/whiteLabelRoutes.js
const express = require('express');
const router = express.Router();
let wl; try { wl = require('../lib/whiteLabelConfig'); } catch(e){ wl = null; }

router.get('/brand', (req, res) => {
  if (!wl) return res.json({ brandName:'SuperSender Pro', primaryColor:'#00a884' });
  res.json({ ok:true, ...wl.getPublic() });
});

router.get('/config', (req, res) => {
  if (!wl) return res.status(503).json({ ok:false, error:'White-label module not loaded' });
  res.json({ ok:true, config: wl.load() });
});

router.post('/config', (req, res) => {
  if (!wl) return res.status(503).json({ ok:false, error:'White-label module not loaded' });
  try {
    const allowed = ['brandName','tagline','primaryColor','secondaryColor','logoUrl','faviconUrl','supportWhatsapp','supportEmail','customDomain','hideBuiltBy','customFooter','currency','country','timezone','language','socialLinks'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const saved = wl.save(updates);
    res.json({ ok:true, config: saved });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/css', (req, res) => {
  if (!wl) { res.type('text/css').send(':root{}'); return; }
  res.type('text/css').send(':root { ' + wl.getCSSVariables() + ' }');
});

module.exports = router;