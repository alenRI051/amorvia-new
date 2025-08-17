// Heavier app logic (loaded on demand)
export function init(){
  console.log('Amorvia app initialized');
  // simulate heavier work split into chunks to avoid long tasks
  const items = Array.from({length: 5000}, (_,i)=>i);
  let i = 0;
  function chunk(){
    const end = Math.min(i+250, items.length);
    for (; i<end; i++) { Math.sqrt(i*i*i); }
    if (i < items.length) {
      if ('requestIdleCallback' in window) requestIdleCallback(chunk);
      else setTimeout(chunk, 0);
    }
  }
  if ('requestIdleCallback' in window) requestIdleCallback(chunk);
  else setTimeout(chunk, 0);
}
