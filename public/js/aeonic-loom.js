window.AeonicLoom = (() => {

  const state = {
    index: null,
  };

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(r => r.json());
  }

  function hideScenarioUI() {
    document.getElementById("scenarioArea")?.classList.add("hidden");
    document.getElementById("engineArea")?.classList.add("hidden");
  }

  function showLoomUI() {
    document.getElementById("aeonicLoom").style.display = "block";
  }

  function renderCategories(idx) {
    const box = document.getElementById("loomCategories");
    box.innerHTML = "";

    idx.categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.textContent = cat.title;
      btn.onclick = () => renderExercises(cat);
      box.appendChild(btn);
    });
  }

  function renderExercises(cat) {
    const box = document.getElementById("loomContent");
    box.innerHTML = `<h3>${cat.title}</h3>`;

    cat.exercises.forEach(ex => {
      const div = document.createElement("div");
      div.className = "loom-exercise";
      div.innerHTML = `<strong>${ex.title}</strong><p>${ex.text}</p>`;
      box.appendChild(div);
    });
  }

  function load() {
    hideScenarioUI();
    showLoomUI();
    return fetchJson("/data/aeonic-loom-index.json")
      .then(idx => {
        state.index = idx;
        renderCategories(idx);
      });
  }

  return { load, state };

})();
