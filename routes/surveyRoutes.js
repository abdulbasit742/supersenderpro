'use strict';
/**
 * Survey + NPS/CSAT routes (#145)
 * Self-mountable: require('./routes/surveyRoutes')(app) OR mounted by
 * lib/bootstrap/registerSubsystems.js. server.js stays untouched.
 *
 * Write routes are admin-guarded (x-admin-secret / ADMIN_TOKEN).
 * Tenant comes from x-tenant-id header or ?tenant= query.
 */
const express = require('express');
const survey = require('../lib/surveyEngine');

function tenantOf(req) {
  const t = req.headers['x-tenant-id'] || req.query.tenant || req.body && req.body.tenantId;
  if (!t) {
    const e = new Error('x-tenant-id header required');
    e.status = 400;
    throw e;
  }
  return t;
}

function adminGuard(req, res, next) {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) return next(); // open in dev when no token set
  const got = req.headers['x-admin-secret'];
  if (got && got === secret) return next();
  return res.status(401).json({ error: 'admin secret required' });
}

function wrap(fn) {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      if (!res.headersSent) res.json(out);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  };
}

function build() {
  const r = express.Router();
  r.use(express.json());

  r.get('/health', (_req, res) => res.json({ ok: true, feature: 'survey-nps-engine' }));
  r.get('/templates', (_req, res) => res.json(Object.keys(survey.TEMPLATES)));

  r.get('/surveys', wrap(async (req) => survey.listSurveys(tenantOf(req))));
  r.get('/surveys/:id', wrap(async (req) => {
    const s = survey.getSurvey(tenantOf(req), req.params.id);
    if (!s) { const e = new Error('not found'); e.status = 404; throw e; }
    return s;
  }));
  r.get('/surveys/:id/score', wrap(async (req) => survey.score(tenantOf(req), req.params.id)));
  r.get('/surveys/:id/themes', wrap(async (req) => survey.summarizeVerbatims(tenantOf(req), req.params.id)));

  r.post('/surveys', adminGuard, wrap(async (req) => survey.createSurvey(tenantOf(req), req.body || {})));
  r.post('/surveys/:id/schedule', adminGuard, wrap(async (req) => {
    const dryRun = req.body && req.body.dryRun === false ? false : true;
    return survey.scheduleSurvey(tenantOf(req), req.params.id, { dryRun });
  }));
  // public-facing: customer submits a response (no admin guard)
  r.post('/surveys/:id/responses', wrap(async (req) => survey.recordResponse(tenantOf(req), req.params.id, req.body || {})));

  return r;
}

module.exports = function mount(app) {
  const router = build();
  if (app && typeof app.use === 'function') app.use('/api/survey', router);
  return router;
};
module.exports.build = build;
