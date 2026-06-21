  'use strict';
  const express = require('express');
  const path = require('path');
  const router = express.Router();
  const countries = require('../lib/localization/countryProfiles');
  const i18n = require('../lib/localization/i18n');
  const bizConfig = require('../lib/localization/businessConfig');

  const ENABLED = String(process.env.LOCALIZATION_ENABLED || 'true').toLowerCase() !== 'false';
  function guard(req,res,next){ if(!ENABLED) return res.status(403).json({ok:false,error:'Localization disabled.'});
  next(); }


  router.get('/status', function (req, res) {
    res.json({ ok:true, module:'localization', phase:1, status:'available', enabled:ENABLED, countries:countries.codes(),
  locales:i18n.locales(), businesses:bizConfig.status(), timestamp:new Date().toISOString() });
  });
  router.get('/countries', guard, function (req, res){ res.json({ ok:true, countries:countries.list() }); });
  router.get('/businesses', guard, function (req, res){ res.json({ ok:true, businesses:bizConfig.list() }); });
  router.get('/config/:id', guard, function (req, res){
    const c = bizConfig.resolve(req.params.id);
    if(!c) return res.status(404).json({ok:false,error:'not_found'});
    res.json({ ok:true, config:c });
  });
  router.post('/config', guard, function (req, res){
    const r = bizConfig.set(req.body||{});
    res.status(r.ok?200:400).json(r);
  });
  router.get('/ui', function (req, res){ res.sendFile(path.join(process.cwd(),'public','localization.html')); });
  module.exports = router;
