Amorvia - Metrics + Save/Load Modal Patch

Files included:
- public/js/metrics.js      -> posts events to /api/track using sendBeacon/fetch
- public/js/app.v2.js       -> replaces prompt-based saves with an in-page modal (Undo + Saves button)
- api/track.js              -> minimal Vercel Function that accepts POST JSON and returns 204

Install:
1) Copy these files into your repo (preserve paths).
2) Ensure your Vercel project allows functions under /api (default is OK).
3) Deploy. After load, open v2 mode and click "Saves" to open the modal.

Notes:
- All files are ASCII only.
- The modal lists existing save slots. Click a pill to load. Use the input to save.
- Metrics events: scenario_start, choice_made, line_next, act_end, save_slot, load_slot.
