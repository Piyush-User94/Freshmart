/* =============================================================
   version.js — single source of truth for the app version.

   Bump `version` here, then mirror it in:
     • VERSION          (plain-text, for CI / scripts)
     • version.json     (machine-readable, fetchable when hosted)
     • CHANGELOG.md     (human-readable history)

   `schema` is the localStorage data-shape version. Bump it only when
   the structure of stored records changes in a non-backward-compatible
   way, so a future migration step can detect old data.
   ============================================================= */
(function () {
  'use strict';

  const VERSION = Object.freeze({
    name: 'Supermarket Management Admin',
    version: '1.1.0',
    channel: 'stable',
    buildDate: '2026-09-04',
    schema: 1,
  });

  // Expose for the UI (Settings → About) and for quick console inspection.
  window.SM_VERSION = VERSION;

  // Stamp the document so the running build is visible in DevTools / page source.
  if (document.documentElement) {
    document.documentElement.setAttribute('data-app-version', VERSION.version);
  }
})();
