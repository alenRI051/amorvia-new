
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Multi‑Act seed loaded");

  // Load scenarios
  let scenarios = [];
  try {
    const r = await fetch("./data/scenarios.json", {cache:"no-store"});
    const j = await r.json();
    scenarios = j.scenarios || [];
  } catch(e){ console.error("Failed to load scenarios.json", e); }

  const state = {
    scenarios, filter:"", currentScenario:null, actIndex:0, stepIndex:0,
    bg: "./assets/backgrounds/room.svg",
    left: "./assets/characters/male_casual.svg",
    right: "./assets/characters/female_casual.svg"
  };

  // Bind UI
  const list = document.querySelector(".list");
  const search = document.querySelector("#search");
  const bgEl = document.querySelector(".bg");
  const leftImg = document.querySelector(".character.left img");
  const rightImg = document.querySelector(".character.right img");

  function renderList(){
    list.innerHTML = "";
    const term = (state.filter||"").toLowerCase();
    state.scenarios.filter(s => s.title.toLowerCase().includes(term)).forEach(s => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<strong>${s.title}</strong> · <span class="badge">Acts: ${s.acts.length}</span>`;
      div.onclick = () => selectScenario(s);
      list.appendChild(div);
    });
  }

  function selectScenario(s){
    state.currentScenario = s; state.actIndex=0; state.stepIndex=0;
    document.querySelector("#sceneTitle").textContent = s.title;
    updateActUI(); renderStep();
  }

  function updateActUI(){
    const s = state.currentScenario; if(!s) return;
    const a = s.acts[state.actIndex];
    document.querySelector("#actBadge").textContent = `Act ${state.actIndex+1} / ${s.acts.length}`;
    document.querySelector("#actTitle").textContent = a.title;
  }

  function renderStep(){
    const s = state.currentScenario; if(!s) return;
    const a = s.acts[state.actIndex];
    const text = a.steps[state.stepIndex];
    document.querySelector("#dialog").textContent = text;
    const last = state.stepIndex >= a.steps.length-1;
    document.querySelector("#nextBtn").textContent = last ? (state.actIndex < s.acts.length-1 ? "Next Act" : "Finish") : "Next";
    document.querySelector("#prevBtn").disabled = (state.stepIndex===0 && state.actIndex===0);
  }

  function next(){
    const s = state.currentScenario; const a = s.acts[state.actIndex];
    if(state.stepIndex < a.steps.length-1){ state.stepIndex++; }
    else if(state.actIndex < s.acts.length-1){ state.actIndex++; state.stepIndex = 0; updateActUI(); }
    else { document.querySelector("#dialog").textContent = "🎉 Scenario complete!"; document.querySelector("#nextBtn").disabled = true; }
    renderStep();
  }
  function prev(){
    const s = state.currentScenario; if(!s) return;
    if(state.stepIndex>0){ state.stepIndex--; }
    else if(state.actIndex>0){ state.actIndex--; const a = s.acts[state.actIndex]; state.stepIndex = a.steps.length-1; updateActUI(); }
    renderStep();
  }

  // Set initial visuals
  bgEl.style.backgroundImage = `url('${state.bg}')`;
  bgEl.style.backgroundSize = "cover";
  bgEl.style.backgroundPosition = "center";
  bgEl.style.backgroundRepeat = "no-repeat";
  leftImg.src = state.left;
  rightImg.src = state.right;

  // Handlers
  document.querySelector("#nextBtn").addEventListener("click", next);
  document.querySelector("#prevBtn").addEventListener("click", prev);
  document.querySelector("#bgSelect").addEventListener("change", e => { bgEl.style.backgroundImage = `url('${e.target.value}')`; });
  document.querySelector("#leftSelect").addEventListener("change", e => { leftImg.src = e.target.value; });
  document.querySelector("#rightSelect").addEventListener("change", e => { rightImg.src = e.target.value; });
  search.addEventListener("input", e => { state.filter = e.target.value; renderList(); });

  renderList();
});
