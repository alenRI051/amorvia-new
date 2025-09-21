
// dom-fixes.v9.3.1.js — ensures #scenario-list sits under #title-and-list
(function(){
  function moveScenarioList() {
    const titleHost = document.querySelector('#title-and-list') || document.querySelector('[data-role="title-and-list"]');
    const list = document.querySelector('#scenario-list') || document.querySelector('[data-role="scenario-list"]');
    if (!titleHost || !list) return;

    // If list is not already inside titleHost, append it
    if (!titleHost.contains(list)) {
      try {
        titleHost.appendChild(list);
        console.info('[Amorvia] Moved #scenario-list under #title-and-list');
      } catch(e) {}
    }

    // Make sure it's visible and on top
    list.style.position = 'relative';
    list.style.zIndex = '3';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveScenarioList);
  } else {
    moveScenarioList();
  }
})();
