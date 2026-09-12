(function () {
  const button = document.getElementById('date-window-button');
  const popover = document.getElementById('date-window-popover');
  const options = Array.from(document.querySelectorAll('[data-planning-window]'));
  if (!button || !popover || !options.length) return;

  const windows = {
    7: 'Sep 16 — Sep 22, 2025',
    14: 'Sep 16 — Sep 29, 2025',
    30: 'Sep 16 — Oct 15, 2025'
  };

  function closePopover() {
    popover.classList.remove('open');
    popover.setAttribute('aria-hidden', 'true');
  }

  function setWindow(days, announce = true) {
    const selectedDays = String(days);
    button.innerHTML = `${windows[selectedDays] || windows[7]} <span>⌄</span>`;
    options.forEach((option) => option.classList.toggle('selected', option.dataset.planningWindow === selectedDays));
    sessionStorage.setItem('chainos-planning-window', selectedDays);
    closePopover();
    if (announce) showToast(`Planning window set to ${selectedDays} days.`);
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = popover.classList.toggle('open');
    popover.setAttribute('aria-hidden', String(!isOpen));
  });
  options.forEach((option) => option.addEventListener('click', () => setWindow(option.dataset.planningWindow)));
  document.addEventListener('click', (event) => {
    if (!popover.contains(event.target) && !button.contains(event.target)) closePopover();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopover();
  });

  setWindow(sessionStorage.getItem('chainos-planning-window') || '7', false);
}());
