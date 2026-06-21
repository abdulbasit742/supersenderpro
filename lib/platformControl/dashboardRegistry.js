// lib/platformControl/dashboardRegistry.js — public pages, nav links, asset refs (static read).
 'use strict';
 const cfg = require('./config');


 const LINK_RE = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
 const SCRIPT_RE = /<script\b[^>]*src=["']([^"']+)["']/gi;
 const CSS_RE = /<link\b[^>]*href=["']([^"']+\.css)["']/gi;


 function htmlPages() { return cfg.walk('public', { exts: ['.html'] }); }


 function dashboardRegistry() {
   const pages = htmlPages();
     const pagesPreview = pages.map((p) => ({ path: p, name: p.split('/').pop() }));
     const indexSrc = cfg.readSafe('public/index.html') || '';


     const links = []; const seenLinks = {};
     let m; LINK_RE.lastIndex = 0;
     while ((m = LINK_RE.exec(indexSrc))) { links.push(m[1]); seenLinks[m[1]] = (seenLinks[m[1]] || 0) + 1; }
   const duplicateLinksPreview = Object.keys(seenLinks).filter((h) => seenLinks[h] > 1).map((h) => ({ href: h, count:
 seenLinks[h] }));


     const brokenLinksPreview = [];
     links.forEach((h) => {
       if (/^https?:|^#|^mailto:|^tel:/.test(h)) return;
       const rel = 'public/' + h.replace(/^\//, '').split('?')[0].split('#')[0];
       if (/\.html$/.test(rel) && !cfg.exists(rel)) brokenLinksPreview.push({ href: h });
     });


     const missingAssetsPreview = [];
     pages.forEach((p) => {
       const src = cfg.readSafe(p) || '';
       [SCRIPT_RE, CSS_RE].forEach((re) => {

           re.lastIndex = 0; let a;
           while ((a = re.exec(src))) {
             const ref = a[1];
               if (/^https?:/.test(ref)) continue;
               const rel = 'public/' + ref.replace(/^\//, '').split('?')[0];
               if (!cfg.exists(rel)) missingAssetsPreview.push({ page: p, asset: ref });
           }
         });
       });


       return cfg.base({ pagesPreview, dashboardLinksPreview: links, duplicateLinksPreview, brokenLinksPreview,
  missingAssetsPreview });
  }


  module.exports = { dashboardRegistry, htmlPages };
