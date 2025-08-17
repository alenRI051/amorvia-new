// Heavier app logic (loaded on demand)
export function init(){
  console.log('Amorvia app initialized (WebP optimized)');
  // Example chunking to avoid long tasks
  const N = 5000;
  let i = 0;
  function chunk(){
    const end = Math.min(i + 250, N);
    for (; i < end; i++) Math.sqrt(i*i*i);
    if (i < N) ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(chunk, 0);
  }
  ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(chunk, 0);
}
