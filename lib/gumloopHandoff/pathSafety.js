 'use strict';
 /**
  * pathSafety.js — relative-path guard. Rejects absolute/hardcoded local paths
     * (D:\, C:\, /Users, /home) and path traversal. Everything here is relative to
     * the workspace root. No filesystem writes.
  */
 const ABSOLUTE_PATTERNS = [
      /^[A-Za-z]:[\\/]/,      // D:\ C:/
      /^\\\\/,                // UNC \\server
      /^\/Users\//,
      /^\/home\//,
      /^\/root\//,
      /^\/var\//,
      /^\/etc\//,
 ];

 function isAbsoluteOrLocal(p) {
      const s = String(p || '');
      return ABSOLUTE_PATTERNS.some((re) => re.test(s));
 }

 function hasTraversal(p) {
   return String(p || '').split(/[\\/]/).includes('..');
 }


 function toRelative(p) {
   let s = String(p || '').replace(/\\/g, '/').trim();
      s = s.replace(/^\.\//, '');
      return s;
 }

 function isSafeRelative(p) {
   return !!p && !isAbsoluteOrLocal(p) && !hasTraversal(p);
 }

 module.exports = { isAbsoluteOrLocal, hasTraversal, toRelative, isSafeRelative, ABSOLUTE_PATTERNS };
