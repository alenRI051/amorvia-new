// hud-stabilizer.v9.6.4.js
// Keeps #hud present even if the engine rewrites the dialog panel.
// Also cleans legacy text lines and re-renders with the last known values.

(function () {
  'use strict';

  const $ = (s, el=document) => el.querySelector(s);

  // --------- last known
