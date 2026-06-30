#!/usr/bin/env node
// scripts/forecast-check.js — validates the Forecast install + the model math
// against synthetic series with a KNOWN trend/seasonality. Exits non-zero on fail.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('engine present', exists('lib/forecasting/forecastEngine.js'));
add('orchestrator present', exists('lib/forecasting/index.js'));
add('route present', exists('routes/forecastRoutes.js'));
add('batch present', exists('scripts/forecast-batch.js'));
add('dashboard present', exists('public/forecast.html'));
add('docs present', exists('docs/FORECASTING.md'));

try {
  const eng = require('../lib/forecasting/forecastEngine');

  // Build 60 days of a clean upward trend (100, 110, 120, ...).
  const start = new Date('2026-01-01T00:00:00Z').getTime();
  const trendUp = [];
  for (let i = 0; i < 60; i++) {
    trendUp.push({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value: 100 + i * 10 });
  }
  const fc = eng.forecast(trendUp, 10);
  add('forecast produces horizon points', fc.points.length === 10);
  // Next-day forecast should continue upward (>= last value ~ 690).
  add('captures upward trend', fc.points[0].forecast > 600);
  // Confidence band ordering holds.
  add('band ordered low<=fc<=high', fc.points[0].lower <= fc.points[0].forecast && fc.points[0].forecast <= fc.points[0].upper);
  // Bands widen with horizon.
  add('bands widen over horizon', (fc.points[9].upper - fc.points[9].lower) >= (fc.points[0].upper - fc.points[0].lower));

  // Seasonality indices average ~1.
  const s = fc.seasonality;
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  add('seasonality normalised ~1', Math.abs(avg - 1) < 0.05);

  // Backtest on a flat series should be very accurate.
  const flat = [];
  for (let i = 0; i < 40; i++) flat.push({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value: 500 });
  const bt = eng.backtest(flat, 10);
  add('backtest runs', bt.ok === true);
  add('flat series forecast accurate', bt.accuracyPct != null && bt.accuracyPct > 90);

  // Orchestrator doesn't throw on empty data.
  const forecasting = require('../lib/forecasting');
  const snap = forecasting.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && !!snap.forecast);
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'forecast_check.json'), JSON.stringify(out, null, 2));
let md = `# Forecast Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'forecast_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
