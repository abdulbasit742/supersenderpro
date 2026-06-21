'use strict';
// PII detection patterns. Used by the sanitizer + redactor. No raw values ever printed.
module.exports = {
     PHONE: /\b(?:\+?\d[\d\s-]{7,}\d)\b/g,
     EMAIL: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
     LONG_DIGITS: /\b\d{10,}\b/g,
};
