 'use strict';
 /**
  * handoffManifest.js — canonical manifest shape + helpers. No I/O.
  */
 function emptyManifest(workspaceName) {
      return {
        workspaceName: workspaceName || 'SuperSender Pro (ClickUp workspace)',
        generatedAt: new Date().toISOString(),
        safeToCopy: [],
        neverCopy: [],
        unknownReview: [],
        createdFiles: [],
        modifiedFiles: [],
        routeMounts: [],
        dashboardLinks: [],
        packageScripts: [],
        envPlaceholders: [],
        gitignoreProtections: [],
        docs: [],
        checkScripts: [],
        smokeTests: [],
        reports: [],
        mergeRisks: [],
        validationCommands: [],
        gumloopNextSteps: [],
        blockers: [],
        warnings: [],
      };
 }

 module.exports = { emptyManifest };
