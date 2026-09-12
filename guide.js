(function () {
  const guide = document.getElementById('command-guide');
  const backdrop = document.getElementById('guide-backdrop');
  const openButton = document.getElementById('help-button');
  const closeButton = document.getElementById('guide-close');
  if (!guide || !backdrop || !openButton || !closeButton) return;

  function openGuide() {
    guide.classList.add('open');
    guide.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('show');
  }
  function closeGuide() {
    guide.classList.remove('open');
    guide.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('show');
  }

  openButton.addEventListener('click', openGuide);
  closeButton.addEventListener('click', closeGuide);
  backdrop.addEventListener('click', closeGuide);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeGuide();
  });
}());
