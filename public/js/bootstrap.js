/* Amorvia bootstrap (safe, no optional-chaining assignment) */
window.addEventListener('DOMContentLoaded', () => {
  const bgImg   = document.getElementById('bgImg');
  const leftImg = document.getElementById('leftImg');
  const rightImg= document.getElementById('rightImg');

  if (bgImg)   bgImg.src   = '/assets/backgrounds/room.svg';
  if (leftImg) leftImg.src = '/assets/characters/male_casual.svg';
  if (rightImg)rightImg.src= '/assets/characters/female_casual.svg';
});
