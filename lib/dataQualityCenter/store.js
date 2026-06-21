  'use strict';

  const fs = require('fs');
  const path = require('path');

  const ROOT = process.cwd();
  const DATA_DIR = path.join(ROOT, 'data', 'dataQuality');
  const FILES = {
    scans: path.join(DATA_DIR, 'scans.json'),
       issues: path.join(DATA_DIR, 'issues.json'),
       snapshots: path.join(DATA_DIR, 'snapshots.json'),
  };

  function ensureDir() {
    try {
         if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
       } catch (_) { /* non-fatal: read paths still degrade gracefully */ }
  }

  function readJson(file, fallback) {
    try {
           if (!fs.existsSync(file)) return fallback;
           const raw = fs.readFileSync(file, 'utf8');
           if (!raw || !raw.trim()) return fallback;
           const parsed = JSON.parse(raw);
         return parsed == null ? fallback : parsed;
       } catch (_) {
           return fallback;
       }
  }

  function writeJson(file, data) {
    // Quality findings only. Never used to mutate source records.
       ensureDir();
       try {
           const tmp = file + '.tmp';
           fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
           fs.renameSync(tmp, file);
           return true;
       } catch (_) {
         return false;
       }
  }

  function listScans() { return readJson(FILES.scans, []); }
  function listIssues() { return readJson(FILES.issues, []); }


function getIssue(id) {
 return listIssues().find((i) => String(i.id) === String(id)) || null;
}

function recordScan(scan) {
 const scans = listScans();
    scans.unshift(scan);
    writeJson(FILES.scans, scans.slice(0, 200)); // cap history
    return scan;
}

function replaceIssues(issues) {
    // Overwrites the findings cache only (not source data). Append-history is in scans.
    writeJson(FILES.issues, Array.isArray(issues) ? issues : []);
    return issues;
}

function lastScan() {
    const scans = listScans();
    return scans.length ? scans[0] : null;
}


module.exports = {
 FILES,
    ensureDir,
    readJson,
    listScans,
    listIssues,
    getIssue,
    recordScan,
    replaceIssues,
    lastScan,
};
