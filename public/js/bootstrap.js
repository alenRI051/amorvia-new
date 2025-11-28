/* 
 * Amorvia — bootstrap.js (ES2018-safe)
 * - Loads app depending on mode (v1/v2)
 * - Avoids bare `catch {}` (older parsers error)
 * - Adds cache-bust ?sig= timestamp on dynamic imports
 */

(function(){
  var KEY_MODE = "amorvia:mode";

  function getMode(){
    try { return localStorage.getItem(KEY_MODE) || "v2"; } catch(e){ return "v2"; }
  }
  function setMode(m){
    try { localStorage.setItem(KEY_MODE, m); } catch(e){}
  }

  function applyModeToDOM(mode){
    var isV2 = mode === "v2";
    try {
      document.body.classList.toggle("mode-v2", isV2);
      document.body.classList.toggle("mode-v1", !isV2);
      var v2Only = document.querySelectorAll(".v2-only");
      for (var i=0;i<v2Only.length;i++){ var el=v2Only[i]; el.hidden = !isV2; el.setAttribute("aria-hidden", String(!isV2)); }
      var v1Only = document.querySelectorAll(".v1-only");
      for (var j=0;j<v1Only.length;j++){ var el2=v1Only[j]; el2.hidden = isV2; el2.setAttribute("aria-hidden", String(isV2)); }
    } catch(e){}
  }

  async function loadChosenApp(){
    var mode = getMode();
    var sig = String(Date.now());
    try {
     if (mode === "v2"){
  await import(`/js/app.v2.js?sig=${sig}`);
  // Extras tabs addon je privremeno isključen u BETA 0.9.x
  // ako ga vratimo, ovdje se može ponovno dodati dynamic import.
  // try {
  //   await import(`/js/addons/extras-tabs.js?sig=${sig}`);
  // } catch (e_inner) {}
} else {
  await import(`/js/app.js?sig=${sig}`);
}
    } catch (err) {
      console.error("[Amorvia] Failed to start app:", err);
    }
  }

  window.addEventListener("DOMContentLoaded", function(){
    // Ensure default art is visible in case engine is slow
    var bgImg   = document.getElementById("bgImg");
    var leftImg = document.getElementById("leftImg");
    var rightImg= document.getElementById("rightImg");
    if (bgImg && !bgImg.src) bgImg.src = "/assets/backgrounds/room.svg";
    if (leftImg && !leftImg.src) leftImg.src = "/assets/characters/male_casual.svg";
    if (rightImg && !rightImg.src) rightImg.src = "/assets/characters/female_casual.svg";

    applyModeToDOM(getMode());
    loadChosenApp();
  });

  // Expose tiny helper to toggle modes from the console if needed
  window.__amorvia_setMode = function(mode){
    setMode(mode === "v1" ? "v1" : "v2");
    location.reload();
  };
})();
