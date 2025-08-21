
/* Bootstrap example that ensures the compat hook loads after app.v2.js */
async function start(){
  const mode = localStorage.getItem('amorvia:mode') || 'v2';
  if (mode === 'v2'){
    const app = await import('/js/app.v2.js');
    await Promise.allSettled([
      import('/js/addons/extras-tabs.js').catch(()=>{}),
      import('/js/addons/art-loader.js').catch(()=>{}),
      import('/js/compat/ensure-graph-hook.js')
    ]);
    app?.init?.();
  } else {
    const v1 = await import('/js/app.js'); v1?.init?.();
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
