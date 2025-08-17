document.addEventListener('DOMContentLoaded', () => {
  console.log('JS ready');
  // Ensure background exists even if CSS preload fails
  const bg = document.getElementById('bg');
  if (bg && !getComputedStyle(bg).backgroundImage.includes('room.svg')) {
    bg.style.backgroundImage = "url('./assets/backgrounds/room.svg')";
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
    bg.style.backgroundRepeat = "no-repeat";
  }
  // Wire buttons (placeholder)
  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');
  if(prev) prev.addEventListener('click', ()=>console.log('Prev clicked'));
  if(next) next.addEventListener('click', ()=>console.log('Next clicked'));
});