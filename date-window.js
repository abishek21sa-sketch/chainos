(function () {
  const button = document.getElementById('date-window-button');
  const popover = document.getElementById('date-window-popover');
  const options = Array.from(document.querySelectorAll('[data-planning-window]'));
  const outlookFilter = document.querySelector('.coverage-panel .panel-filter');
  if (!button || !popover || !options.length) return;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');

  const fallbackAnchor = new Date('2025-09-16T00:00:00-05:00');
  let anchorDate = fallbackAnchor;
  let selectedDays = sessionStorage.getItem('chainos-planning-window') || '7';

  function parseAnchor(value) {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : fallbackAnchor;
  }

  try {
    const persistedFixture = JSON.parse(sessionStorage.getItem('chainos-imported-fixture') || 'null');
    if (persistedFixture?.asOf) anchorDate = parseAnchor(persistedFixture.asOf);
  } catch (error) {
    // Ignore an invalid session snapshot; the bundled demo date remains the fallback.
  }

  function formatWindow(days) {
    const start = new Date(anchorDate);
    const end = new Date(anchorDate);
    end.setDate(end.getDate() + Number(days) - 1);
    const format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${format(start)} — ${format(end)}`;
  }

  function closePopover() {
    popover.classList.remove('open');
    popover.setAttribute('aria-hidden', 'true');
    button.setAttribute('aria-expanded', 'false');
  }

  function setWindow(days, announce = true) {
    selectedDays = String(days);
    button.innerHTML = `${formatWindow(selectedDays)} <span>⌄</span>`;
    if (outlookFilter) outlookFilter.innerHTML = `Next ${selectedDays} days <span>⌄</span>`;
    options.forEach((option) => option.classList.toggle('selected', option.dataset.planningWindow === selectedDays));
    sessionStorage.setItem('chainos-planning-window', selectedDays);
    closePopover();
    if (announce) showToast(`Planning window set to ${selectedDays} days.`);
  }

  function updateAnchor(value) {
    anchorDate = parseAnchor(value);
    setWindow(selectedDays, false);
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = popover.classList.toggle('open');
    popover.setAttribute('aria-hidden', String(!isOpen));
    button.setAttribute('aria-expanded', String(isOpen));
  });
  options.forEach((option) => option.addEventListener('click', () => setWindow(option.dataset.planningWindow)));
  document.addEventListener('click', (event) => {
    if (!popover.contains(event.target) && !button.contains(event.target)) closePopover();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopover();
  });
  document.addEventListener('chainos:fixture-import', (event) => updateAnchor(event.detail?.fixture?.asOf));

  setWindow(selectedDays, false);
}());
