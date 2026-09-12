(function () {
  document.body.insertAdjacentHTML('beforeend', '<div class="activity-backdrop" id="activity-backdrop"></div><section class="activity-panel" id="activity-panel" aria-hidden="true" role="dialog" aria-labelledby="activity-title"><button class="activity-close" id="activity-close" aria-label="Close planner activity">×</button><div class="drawer-kicker">PLANNER ACTIVITY</div><h2 id="activity-title">Recent decisions</h2><p class="activity-intro">A local review trail for actions queued in this browser.</p><div class="activity-list" id="activity-list"></div><div class="activity-foot">Stored locally for this demo session · no requests sent</div></section>');
  const panel = document.getElementById('activity-panel');
  const backdrop = document.getElementById('activity-backdrop');
  const list = document.getElementById('activity-list');
  const openButton = document.getElementById('notification-button');
  const closeButton = document.getElementById('activity-close');
  const storageKey = 'chainos-planner-activity';
  if (!panel || !backdrop || !list || !openButton || !closeButton) return;

  function readActivity() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (error) { return []; }
  }
  function writeActivity(entries) { localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, 8))); }
  function recordActivity(label) {
    const entries = readActivity();
    entries.unshift({ label, time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) });
    writeActivity(entries);
  }
  function renderActivity() {
    const entries = readActivity();
    list.innerHTML = entries.length ? entries.map((entry) => `<div class="activity-item"><span class="activity-icon">✓</span><div><strong>${entry.label}</strong><small>${entry.time}</small></div><span class="activity-status">Queued</span></div>`).join('') : '<div class="activity-empty"><strong>No queued decisions yet</strong><span>Accept a recommendation or queue a request to start the local trail.</span></div>';
  }
  function open() { renderActivity(); panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show'); }
  function close() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }

  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  document.addEventListener('click', (event) => {
    const action = event.target.closest('#accept-action, #drawer-action');
    if (!action || action.disabled) return;
    const label = action.id === 'accept-action' ? 'Expedite PO-8421 recommendation' : action.textContent.replace('→', '').trim();
    recordActivity(label);
  });
  document.addEventListener('chainos:activity', (event) => { if (event.detail?.label) recordActivity(event.detail.label); });
}());
