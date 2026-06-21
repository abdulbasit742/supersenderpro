// src/modules/ui/index.js
// Serves the font system + switcher and injects them into any dashboard HTML.
// Drop-in: every existing dashboard can opt in with a single ui.inject(html) call,
// or by adding the two <head> lines manually.

'use strict';


const fs = require('fs');
const path = require('path');

const CONFIG = {
     enabled: String(process.env.UI_FONTS_ENABLED || 'true') === 'true',
     defaultFont: process.env.UI_DEFAULT_FONT || 'inter',
     allowFonts: String(process.env.UI_ALLOW_FONTS || 'system,inter,jakarta,grotesk,roboto,mono,urdu,notosans')
       .split(',').map((s) => s.trim()).filter(Boolean),
};


// Resolve the two static asset files (live in src/ui/).
const UI_DIR = path.join(__dirname, '..', '..', 'ui');
const FONTS_CSS = path.join(UI_DIR, 'fonts.css');
const SWITCHER_JS = path.join(UI_DIR, 'fontSwitcher.js');

function readSafe(p) {
     try { return fs.readFileSync(p, 'utf8'); } catch (_) { return ''; }
}

function register(app) {
     app.get('/ui/fonts.css', (_req, res) => {
       res.type('text/css').send(readSafe(FONTS_CSS));
     });

     app.get('/ui/fontSwitcher.js', (_req, res) => {
       res.type('application/javascript').send(readSafe(SWITCHER_JS));
     });

     app.get('/api/ui/status', (_req, res) => res.json({
       ok: true,
       enabled: CONFIG.enabled,
       defaultFont: CONFIG.defaultFont,
       allowFonts: CONFIG.allowFonts,
       assets: { fontsCss: fs.existsSync(FONTS_CSS), switcherJs: fs.existsSync(SWITCHER_JS) },
     }));

     return { inject, headTags };
}

// The two lines to drop in a dashboard <head>, plus the config the switcher reads.
function headTags() {
  if (!CONFIG.enabled) return '';


      return [
       '<link rel="stylesheet" href="/ui/fonts.css">',
       '<script>window.SSP_DEFAULT_FONT=' + JSON.stringify(CONFIG.defaultFont) +
         ';window.SSP_ALLOW_FONTS=' + JSON.stringify(CONFIG.allowFonts) + ';</script>',
       '<script defer src="/ui/fontSwitcher.js"></script>',
    ].join('\n  ');
  }

  // Inject the tags into an existing HTML string (before </head>, or prepend if none).
  function inject(html) {
      if (!CONFIG.enabled || typeof html !== 'string') return html;
      const tags = headTags();
    if (html.includes('</head>')) return html.replace('</head>', tags + '\n  </head>');
      // No <head>? Prepend so the assets still load.
      return tags + '\n  ' + html;
  }


  module.exports = { register, inject, headTags, CONFIG };
