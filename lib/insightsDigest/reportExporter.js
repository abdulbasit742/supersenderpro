// lib/insightsDigest/reportExporter.js
// Turns a digest into a downloadable founder report. Two formats, both produced
// with zero extra dependencies:
//   - html : a self-contained, print-to-PDF-ready page (open + Ctrl/Cmd-P)
//   - csv  : a flat metrics table for spreadsheets
// We deliberately render print-ready HTML rather than pulling in a PDF lib here;
// the app already ships pdfkit if a true binary PDF is ever needed, but HTML
// keeps the report dependency-free, styleable, and proxy-safe.

function money(n) { return 'PKR ' + Number(n || 0).toLocaleString(); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function toHTML(digest) {
  const d = digest.sections;
  const row = (label, val) => `<tr><td>${esc(label)}</td><td class="num">${esc(val)}</td></tr>`;
  const sec = (title, available, rows) =>
    `<h2>${esc(title)} ${available ? '' : '<span class="na">(no data)</span>'}</h2>` +
    (available ? `<table>${rows}</table>` : '<p class="na">Module not available yet.</p>');

  const actions = (digest.actions || []).map((a) => `<li class="a-${a.priority}"><b>${esc(a.priority)}</b> — ${esc(a.text)}</li>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Founder Report — ${esc(digest.storeId)} — ${esc(digest.generatedAt.slice(0, 10))}</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111;max-width:780px;margin:30px auto;padding:0 20px;line-height:1.5}
  h1{font-size:24px;margin-bottom:2px}.meta{color:#666;font-size:13px;margin-bottom:18px}
  .narrative{background:#f4f8f7;border-left:4px solid #00a884;padding:12px 14px;border-radius:6px;margin-bottom:20px}
  h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
  td{padding:5px 8px;border-bottom:1px solid #f0f0f0}.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
  ul{padding-left:18px}li{margin:5px 0}
  .a-critical{color:#c0392b}.a-high{color:#d35400}.a-medium{color:#b7950b}.a-low{color:#555}
  .na{color:#999;font-weight:400}
  .foot{margin-top:28px;color:#999;font-size:11px;border-top:1px solid #eee;padding-top:10px}
  @media print{body{margin:0}}
</style></head><body>
<h1>Founder Insights Report</h1>
<div class="meta">Store: ${esc(digest.storeId)} · Generated ${esc(digest.generatedAt)} · ${digest.modulesAvailable}/${digest.modulesTotal} modules reporting</div>
<div class="narrative">${esc(digest.narrative)}</div>

<h2>Do this today</h2><ul>${actions}</ul>

${sec('Revenue & Conversion', d.analytics.available, [
  row('Lifetime revenue', d.analytics.available ? money(d.analytics.revenue) : ''),
  row('MRR', d.analytics.available ? money(d.analytics.mrr) : ''),
  row('Customers', d.analytics.available ? d.analytics.customers : ''),
  row('Lead → customer', d.analytics.available ? d.analytics.leadToCustomerPct + '%' : ''),
].join(''))}

${sec('30-Day Forecast', d.forecast.available, [
  row('Projected revenue', d.forecast.available ? money(d.forecast.next30Revenue) : ''),
  row('Range (95%)', d.forecast.available ? money(d.forecast.next30Low) + ' – ' + money(d.forecast.next30High) : ''),
  row('Backtest accuracy', d.forecast.available && d.forecast.backtestAccuracyPct != null ? d.forecast.backtestAccuracyPct + '%' : ''),
].join(''))}

${sec('Churn Risk', d.churn.available, [
  row('Predicted churn rate', d.churn.available ? d.churn.predictedChurnRatePct + '%' : ''),
  row('Revenue at risk', d.churn.available ? money(d.churn.revenueAtRisk) : ''),
  row('High-risk customers', d.churn.available ? d.churn.highRisk : ''),
].join(''))}

${sec('Attribution', d.attribution.available, [
  row('Conversions analysed', d.attribution.available ? d.attribution.conversions : ''),
  row('Multi-touch share', d.attribution.available ? d.attribution.multiTouchSharePct + '%' : ''),
  row('Top opener', d.attribution.available ? (d.attribution.topOpener || '—') : ''),
  row('Top closer', d.attribution.available ? (d.attribution.topCloser || '—') : ''),
].join(''))}

${sec('Cohort Retention', d.cohorts.available, [
  row('Cohorts tracked', d.cohorts.available ? d.cohorts.cohorts : ''),
  row('Avg M1 retention', d.cohorts.available && d.cohorts.avgM1RetentionPct != null ? d.cohorts.avgM1RetentionPct + '%' : ''),
].join(''))}

${sec('Alerts', d.alerts.available, [
  row('Open alerts', d.alerts.available ? d.alerts.open : ''),
  row('Critical', d.alerts.available ? d.alerts.critical : ''),
  row('Warning', d.alerts.available ? d.alerts.warning : ''),
].join(''))}

<div class="foot">SuperSender Pro — Founder Insights Report. Print to PDF with Ctrl/Cmd-P.</div>
</body></html>`;
}

function toCSV(digest) {
  const d = digest.sections;
  const lines = [['section', 'metric', 'value']];
  const push = (section, metric, value) => lines.push([section, metric, String(value == null ? '' : value)]);

  if (d.analytics.available) {
    push('analytics', 'revenue', d.analytics.revenue);
    push('analytics', 'mrr', d.analytics.mrr);
    push('analytics', 'customers', d.analytics.customers);
    push('analytics', 'leadToCustomerPct', d.analytics.leadToCustomerPct);
  }
  if (d.forecast.available) {
    push('forecast', 'next30Revenue', d.forecast.next30Revenue);
    push('forecast', 'next30Low', d.forecast.next30Low);
    push('forecast', 'next30High', d.forecast.next30High);
    push('forecast', 'backtestAccuracyPct', d.forecast.backtestAccuracyPct);
  }
  if (d.churn.available) {
    push('churn', 'predictedChurnRatePct', d.churn.predictedChurnRatePct);
    push('churn', 'revenueAtRisk', d.churn.revenueAtRisk);
    push('churn', 'highRisk', d.churn.highRisk);
  }
  if (d.attribution.available) {
    push('attribution', 'conversions', d.attribution.conversions);
    push('attribution', 'multiTouchSharePct', d.attribution.multiTouchSharePct);
    push('attribution', 'topOpener', d.attribution.topOpener);
    push('attribution', 'topCloser', d.attribution.topCloser);
  }
  if (d.cohorts.available) {
    push('cohorts', 'cohorts', d.cohorts.cohorts);
    push('cohorts', 'avgM1RetentionPct', d.cohorts.avgM1RetentionPct);
  }
  if (d.alerts.available) {
    push('alerts', 'open', d.alerts.open);
    push('alerts', 'critical', d.alerts.critical);
    push('alerts', 'warning', d.alerts.warning);
  }

  return lines.map((r) => r.map((c) => {
    const s = String(c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
}

module.exports = { toHTML, toCSV };
