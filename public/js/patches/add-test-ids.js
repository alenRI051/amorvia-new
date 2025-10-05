// add-test-ids.js — non-invasive test hooks for Cypress

(function () {
  const setIf = (id, attr, val) => {
    const el = document.getElementById(id);
    if (el && !el.getAttribute(attr)) el.setAttribute(attr, val);
    return el;
  };

  const once = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  once(() => {
    // Stable hooks on static nodes (if present in DOM)
    setIf('scenarioPicker', 'data-testid', 'scenario-picker');
    setIf('restartAct', 'data-testid', 'restart-act');
    setIf('modeSelect', 'data-testid', 'mode-select');
    setIf('dialog', 'data-testid', 'dialog');
    setIf('choices', 'data-testid', 'choices');
    setIf('actBadge', 'data-testid', 'act-badge');
    setIf('sceneTitle', 'data-testid', 'scene-title');

    // Observe #choices for dynamically rendered buttons and tag them
    const choices = document.getElementById('choices');
    if (choices) {
      const tagChoiceButtons = (root) => {
        root.querySelectorAll('button, [role="button"]').forEach((btn, i) => {
          // Keep existing attributes if already set
          if (!btn.getAttribute('data-testid')) {
            // Try to use an existing id/data-id if your renderer sets it
            const cid = btn.getAttribute('id') ||
                        btn.getAttribute('data-id') ||
                        (btn.textContent || '').trim().toLowerCase()
                          .replace(/\s+/g, '-')
                          .replace(/[^a-z0-9-_]/g, '');
            btn.setAttribute('data-testid', `choice-${cid || i}`);
          }
        });
      };

      // Tag any existing buttons now
      tagChoiceButtons(choices);

      // Tag any future buttons added by your renderer
      const mo = new MutationObserver((muts) => {
        muts.forEach((m) => {
          if (m.addedNodes && m.addedNodes.length) {
            m.addedNodes.forEach((n) => {
              if (n.nodeType === 1) {
                if (n.matches?.('button,[role="button"]')) {
                  tagChoiceButtons(choices);
                } else {
                  tagChoiceButtons(n);
                }
              }
            });
          }
        });
      });
      mo.observe(choices, { childList: true, subtree: true });
    }

    // Optional: lightweight scenario boot helper for tests
    // (Call from Cypress via window.__bootScenario(id))
    window.__bootScenario = async function (scenarioId) {
      try {
        // Ensure v2 mode if the control exists
        const mode = document.getElementById('modeSelect');
        if (mode) {
          mode.value = 'v2';
          mode.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Select the scenario in the picker if present
        const picker = document.getElementById('scenarioPicker');
        if (picker) {
          const opt = Array.from(picker.options).find(o => o.value === scenarioId || o.textContent.trim() === scenarioId);
          if (opt) {
            picker.value = opt.value;
            picker.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // If your app exposes a programmatic loader, use it too
        // e.g., window.App?.loadScenario?.(scenarioId)

      } catch (e) {
        console.warn('bootScenario helper failed:', e);
      }
    };
  });
})();
