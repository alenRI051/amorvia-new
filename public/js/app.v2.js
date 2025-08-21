
export function init(){
  const picker = document.getElementById('scenarioPicker');
  const actBadge = document.getElementById('actBadge');
  const sceneTitle = document.getElementById('sceneTitle');
  const dialog = document.getElementById('dialog');
  const choices = document.getElementById('choices');
  const hud = document.getElementById('hud');
  const restartBtn = document.getElementById('restartAct');

  let state = { scenario:null, actIndex:0, stepIndex:0 };

  async function loadIndex(){
    const res = await fetch('/data/v2-index.json?v='+(window.__AMORVIA_VERSION__||Date.now()), { cache:'no-cache' });
    const idx = await res.json();
    const list = idx.scenarios || [];
    picker.innerHTML = '';
    list.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.title || s.id;
      picker.appendChild(opt);
    });
    if (list.length) await selectScenario(list[0].id);
  }

  async function selectScenario(id){
    const res = await fetch(`/data/${id}.v2.json?v=`+(window.__AMORVIA_VERSION__||Date.now()), { cache:'no-cache' });
    const doc = await res.json();
    state = { scenario: doc, actIndex: 0, stepIndex: 0 };
    picker.value = id;
    render();
  }

  function render(){
    const s = state.scenario;
    if (!s) return;
    const act = s.acts[state.actIndex];
    actBadge.textContent = act?.title || `Act ${state.actIndex+1}`;
    sceneTitle.textContent = s.title || s.id;

    const steps = act?.steps || [];
    const step = steps[state.stepIndex] || '';
    dialog.textContent = typeof step === 'string' ? step : (step.text || JSON.stringify(step));

    choices.innerHTML = '';
    const opts = step && step.choices || act?.choices || null;
    if (Array.isArray(opts)) {
      opts.forEach((c,i)=>{
        const btn = document.createElement('button');
        btn.className='button';
        btn.textContent = c.label || c.text || `Option ${i+1}`;
        btn.addEventListener('click', ()=>{
          if (typeof c.gotoAct === 'number') { state.actIndex = c.gotoAct; state.stepIndex = 0; }
          else if (typeof c.goto === 'number') { state.stepIndex = c.goto; }
          else { state.stepIndex = Math.min(state.stepIndex+1, steps.length-1); }
          render();
        });
        choices.appendChild(btn);
      });
    }

    hud.innerHTML = '';
    const info = `Act ${state.actIndex+1}/${s.acts.length} • Step ${state.stepIndex+1}/${steps.length}`;
    const span = document.createElement('span');
    span.textContent = info;
    hud.appendChild(span);
  }

  picker.addEventListener('change', ()=>selectScenario(picker.value));
  restartBtn?.addEventListener('click', ()=>{ state.stepIndex = 0; render(); });
  window.addEventListener('amorvia:open-scenario-doc', (e)=>{ state = { scenario: e.detail.doc, actIndex:0, stepIndex:0 }; render(); });

  loadIndex().catch(err=>console.error('Failed to init v2', err));
}
