   'use strict';
   /** Builds a public-safe FAQ list from published public_safe articles. */
   const articleStore = require('./articleStore');
   function build(opts) { return articleStore.list({ visibility: 'public_safe' }).filter((a) => a.status ===
   'published').map((a) => ({ q: a.title, a: a.summary, category: a.category, slug: a.slug })); }
   module.exports = { build };
