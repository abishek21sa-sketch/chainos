(function () {
  const drawer = document.getElementById('detail-drawer');
  const action = document.getElementById('drawer-action');
  if (!drawer || !action) return;
  action.insertAdjacentHTML('beforebegin', '<div class="resolution-block"><div class="drawer-label">Exception lifecycle</div><div class="resolution-row"><span class="resolution-state" id="resolution-state">Open</span></div><button class="resolution-button" id="resolution-button" type="button">Mark exception resolved</button><p class="resolution-copy">Resolve when the planner no longer needs to carry this signal.</p></div>');
  const button = document.getElementById('resolution-button');
  const state = document.getElementById('resolution-state');
  let activeType = 'shortage';
  function key(type) { return `chainos-resolution-${type || 'shortage'}`; }
  function read(type) { return sessionStorage.getItem(key(type)) || 'open'; }
  function render(type) {
    activeType = type || 'shortage';
    const resolved = read(activeType) === 'resolved';
    const disabled = activeType === 'healthy';
    state.textContent = disabled ? 'No exception' : resolved ? 'Resolved' : 'Open';
    state.classList.toggle('resolved', resolved || disabled);
    button.textContent = disabled ? 'No action required' : resolved ? 'Reopen exception' : 'Mark exception resolved';
    button.classList.toggle('resolved', resolved || disabled);
    button.disabled = disabled;
  }
  document.addEventListener('chainos:drawer-open', (event) => render(event.detail?.type));
  button.addEventListener('click', () => {
    if (activeType === 'healthy') return;
    const next = read(activeType) === 'resolved' ? 'open' : 'resolved';
    sessionStorage.setItem(key(activeType), next); render(activeType);
    document.dispatchEvent(new CustomEvent('chainos:resolution', { detail: { type: activeType, status: next } }));
    document.dispatchEvent(new CustomEvent('chainos:activity', { detail: { label: next === 'resolved' ? 'Exception resolved' : 'Exception reopened' } }));
    showToast(next === 'resolved' ? 'Exception resolved and removed from active triage.' : 'Exception reopened for planner review.');
  });
  render('shortage');
}());
