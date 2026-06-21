  'use strict';

  /**
      * Local Worker Bridge — JSON-file persistence.
      *
      * Handles the worker registry and the inbound relay log. Files are created
      * lazily under the repo-relative paths from config. Writes are atomic-ish
      * (write temp then rename). Only hashed tokens are ever persisted.
      */

  const fs = require('fs');
  const path = require('path');
  const { config } = require('./config');
  const { safeInboundEntry } = require('./payloads');

  function ensureDir(filePath) {
    const dir = path.dirname(filePath);
       if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }


  function readJson(filePath, fallback) {
       try {
         if (!fs.existsSync(filePath)) return fallback;
           const raw = fs.readFileSync(filePath, 'utf8');
           if (!raw.trim()) return fallback;
         return JSON.parse(raw);
       } catch (_e) {
           // Corrupt/unreadable file should not crash the server.
           return fallback;
       }
  }

  function writeJson(filePath, data) {
       ensureDir(filePath);
       const tmp = filePath + '.tmp';
       fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
       fs.renameSync(tmp, filePath);
  }

  /* ---------------- Worker registry ---------------- */


  function readWorkers() {
    const data = readJson(config.storePath, { workers: [] });
       return Array.isArray(data.workers) ? data.workers : [];
  }

  function writeWorkers(workers) {


   writeJson(config.storePath, { workers, updatedAt: new Date().toISOString() });
}

function getWorker(workerId) {
 return readWorkers().find((w) => w.workerId === workerId) || null;
}


function upsertWorker(worker) {
 const workers = readWorkers();
   const idx = workers.findIndex((w) => w.workerId === worker.workerId);
   if (idx === -1) workers.push(worker);
   else workers[idx] = worker;
   writeWorkers(workers);
   return worker;
}


function removeWorker(workerId) {
   const workers = readWorkers();
   const next = workers.filter((w) => w.workerId !== workerId);
   const removed = next.length !== workers.length;
   if (removed) writeWorkers(next);
   return removed;
}


/* ---------------- Inbound relay log ---------------- */


function readInbound() {
   const data = readJson(config.inboundStorePath, { entries: [] });
   return Array.isArray(data.entries) ? data.entries : [];
}

function writeInbound(entries) {
 writeJson(config.inboundStorePath, {
       entries,
       updatedAt: new Date().toISOString(),
   });
}


/** Append a SAFE inbound entry (phones masked, raw payload dropped). */
function appendInbound(input) {
 const entry = safeInboundEntry(input);
   const entries = readInbound();
   entries.unshift(entry);
   // bound the log
   if (entries.length > config.maxInboundLog) {
       entries.length = config.maxInboundLog;
   }
   writeInbound(entries);
   return entry;
}


function listInbound(limit) {
 const entries = readInbound();
   const n = Number.isFinite(limit) ? limit : 100;
   return entries.slice(0, n);
}


module.exports = {
    // low-level (shared by jobQueue)
    readJson,
    writeJson,
    ensureDir,
    // workers
    readWorkers,
    writeWorkers,
    getWorker,
    upsertWorker,
    removeWorker,
    // inbound
    appendInbound,
    listInbound,
};
