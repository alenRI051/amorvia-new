// amorvia-hud.v9.7.js
// HUD v9.7 Polish Pack – UX refinements
(function() {
  function renderHUD({ trust, tension, childStress }) {
    const hud = document.getElementById('hud');
    if (!hud) return;

    hud.innerHTML = `
      <div class="hud-meter">
        <label>Trust</label>
        <progress class="trust" value="${trust}" max="100"></progress>
      </div>
      <div class="hud-meter">
        <label>Tension</label>
        <progress class="tension" value="${tension}" max="100"></progress>
      </div>
      <div class="hud-meter">
        <label>Child Stress</label>
        <progress class="childStress" value="${childStress}" max="100"></progress>
      </div>
    `;
  }
  window.amorviaHudRender = renderHUD;
})(); 
