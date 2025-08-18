export function init(){
  const $ = (s)=>document.querySelector(s);
  const list = $('#scenarioList');
  const search = $('#search');
  const bgEl = $('#bg');
  const leftImg = $('#leftImg');
  const rightImg = $('#rightImg');
  const leftSel = $('#leftSelect');
  const rightSel = $('#rightSelect');
  const bgSel = $('#bgSelect');
  const sceneTitle = $('#sceneTitle');
  const actBadge = $('#actBadge');
  const dialog = $('#dialog');
  const nextBtn = $('#nextBtn');
  const prevBtn = $('#prevBtn');

  const state = {
    scenarios: [],
    filter: '',
    current: null,
    actIndex: 0,
    stepIndex: 0,
    left: './assets/characters/male_casual.svg',
    right: './assets/characters/female_casual.svg',
    bg: './assets/backgrounds/room.svg'
  };

  if(leftImg) leftImg.src = state.left;
  if(rightImg) rightImg.src = state.right;

  fetch('./data/scenarios.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => { state.scenarios = data.scenarios || []; renderList(); })
    .catch(() => { if(list) list.innerHTML = '<em>Failed to load scenarios.</em>'; });

  function renderList(){
    if(!list) return;
    const term = state.filter.trim().toLowerCase();
    list.innerHTML = '';
    state.scenarios
      .filter(s => s.title.toLowerCase().includes(term))
      .forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'button';
        btn.style.textAlign = 'left';
        btn.innerHTML = `<strong>${s.title}</strong> <span class="badge">Acts: ${s.acts?.length||1}</span>`;
        btn.addEventListener('click', () => selectScenario(s));
        list.appendChild(btn);
      });
  }

  function selectScenario(s){
    state.current = s;
    state.actIndex = 0;
    state.stepIndex = 0;
    if(sceneTitle) sceneTitle.textContent = s.title;
    updateActUI();
    renderStep();
  }

  function updateActUI(){
    const s = state.current; if(!s) return;
    if(actBadge) actBadge.textContent = `Act ${state.actIndex+1} / ${s.acts.length}`;
  }

  function renderStep(){
    const s = state.current; if(!s) { if(dialog) dialog.textContent='Pick a scenario to begin.'; return; }
    const act = s.acts[state.actIndex];
    const step = act.steps[state.stepIndex];
    const text = typeof step === 'string' ? step : (step?.text || '');
    if(dialog) dialog.textContent = text;
    if(nextBtn){
      const lastInAct = state.stepIndex >= act.steps.length-1;
      nextBtn.textContent = lastInAct ? (state.actIndex < s.acts.length-1 ? 'Next Act' : 'Finish') : 'Next';
      nextBtn.disabled = false;
    }
    if(prevBtn){
      prevBtn.disabled = (state.stepIndex===0 && state.actIndex===0);
    }
  }

  function next(){
    const s = state.current; if(!s) return;
    const act = s.acts[state.actIndex];
    if(state.stepIndex < act.steps.length-1){
      state.stepIndex++;
    } else if(state.actIndex < s.acts.length-1){
      state.actIndex++; state.stepIndex=0; updateActUI();
    } else {
      if(dialog) dialog.textContent = '🎉 Scenario complete!';
      if(nextBtn) nextBtn.disabled = true;
    }
    renderStep();
  }

  function prev(){
    const s = state.current; if(!s) return;
    if(state.stepIndex > 0){
      state.stepIndex--;
    } else if(state.actIndex > 0){
      state.actIndex--;
      const prevAct = s.acts[state.actIndex];
      state.stepIndex = prevAct.steps.length-1;
      updateActUI();
    }
    renderStep();
  }

  if(search) search.addEventListener('input', e => { state.filter = e.target.value; renderList(); });
  if(bgSel) bgSel.addEventListener('change', e => { state.bg = e.target.value; if(bgEl){ bgEl.style.backgroundImage = `url('${state.bg}')`; } });
  if(leftSel) leftSel.addEventListener('change', e => { state.left = e.target.value; if(leftImg) leftImg.src = state.left; });
  if(rightSel) rightSel.addEventListener('change', e => { state.right = e.target.value; if(rightImg) rightImg.src = state.right; });
  if(nextBtn) nextBtn.addEventListener('click', next);
  if(prevBtn) prevBtn.addEventListener('click', prev);

  if(bgEl){ bgEl.style.backgroundImage = `url('${state.bg}')`; bgEl.style.backgroundSize='cover'; bgEl.style.backgroundPosition='center'; bgEl.style.backgroundRepeat='no-repeat'; }
}
