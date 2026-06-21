'use strict';


/**
    * Mock Gateway — readiness scoring from doctor checks. Pure function.
    */

function score(checks) {
    const list = Array.isArray(checks) ? checks : [];
    if (!list.length) return { score: 0, passed: 0, total: 0 };
    const passed = list.filter(function (c) { return c.ok; }).length;
    return { score: Math.round((passed / list.length) * 100), passed: passed, total: list.length };
}

module.exports = { score };
