
// Remove scenario tabs v2: robust against unknown markup
(function(){
  function removeNode(n){ if (n && n.parentNode) n.parentNode.removeChild(n); }

  function run(){
    const title = document.getElementById('titleAndList');
    if (!title) return;

    // 1) Remove any rows after the first one (the first contains the dropdown & restart)
    Array.from(title.querySelectorAll('.row')).forEach((row, idx) => {
      if (idx >= 1) removeNode(row);
    });

    // 2) Remove explicit containers if present
    ['[aria-label="Scenarios"]', '#scenarioList', '.scenario-tabs', '.list.scenarios', '[role="tablist"]', '.tabs', '.tabbar']
      .forEach(sel => title.querySelectorAll(sel).forEach(removeNode));

    // 3) Remove any row that contains 3+ buttons (typical chip bar)
    Array.from(title.querySelectorAll('.row')).forEach(row => {
      const btns = row.querySelectorAll('button, a[role="button"]');
      if (btns.length >= 3) removeNode(row);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') run();
  else document.addEventListener('DOMContentLoaded', run, { once:true });
})();
