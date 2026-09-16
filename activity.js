(function () {
  document.body.insertAdjacentHTML('beforeend', '<div class="activity-backdrop" id="activity-backdrop"></div><section class="activity-panel" id="activity-panel" aria-hidden="true" role="dialog" aria-labelledby="activity-title"><button class="activity-close" id="activity-close" aria-label="Close planner activity">×</button><div class="drawer-kicker">PLANNER ACTIVITY</div><div class="activity-heading"><h2 id="activity-title">Recent decisions</h2><button class="activity-export" id="activity-export" type="button">Export CSV ↓</button></div><p class="activity-intro">A local review trail for actions queued in this browser. Click a status to mark it reviewed.</p><div class="activity-list" id="activity-list"></div><div class="activity-foot">Stored locally for this demo session · no requests sent<button class="activity-reset" id="activity-reset" type="button">Reset local demo state</button></div></section>');
  const panel = document.getElementById('activity-panel');
  const backdrop = document.getElementById('activity-backdrop');
  const list = document.getElementById('activity-list');
  const openButton = document.getElementById('notification-button');
  const closeButton = document.getElementById('activity-close');
  const resetButton = document.getElementById('activity-reset');
  const exportButton = document.getElementById('activity-export');
  const storageKey = 'chainos-planner-activity';
  if (!panel || !backdrop || !list || !openButton || !closeButton) return;

  function readActivity() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (error) { return []; }
  }
  function writeActivity(entries) { localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, 8))); }
  function csvValue(value) { return `"${String(value).replace(/"/g, '""')}"`; }
  function recordActivity(label) {
    const entries = readActivity();
    entries.unshift({ label, status: 'Queued', time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) });
    writeActivity(entries);
  }
  function renderActivity() {
    const entries = readActivity();
    list.innerHTML = entries.length ? entries.map((entry, index) => { const isAction = /Expedite|Scenario plan/.test(entry.label); const approved = entry.status === 'Approved'; return `<div class="activity-item"><span class="activity-icon">✓</span><div><strong>${entry.label}</strong><small>${entry.time}</small></div><div class="activity-actions"><button class="activity-status ${entry.status === 'Reviewed' ? 'reviewed' : ''} ${approved ? 'approved' : ''}" data-activity-index="${index}" type="button">${entry.status || 'Queued'}</button>${isAction ? `<button class="activity-approve" data-activity-approve="${index}" type="button" ${approved ? 'disabled' : ''}>${approved ? '✓ Approved' : 'Approve'}</button>` : ''}</div></div>`; }).join('') : '<div class="activity-empty"><strong>No queued decisions yet</strong><span>Accept a recommendation or queue a request to start the local trail.</span></div>';
  }
  function open() { renderActivity(); panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show'); }
  function close() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }

  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  resetButton.addEventListener('click', () => {
    if (!window.confirm('Reset saved views, notes, approvals, and exception status for this demo?')) return;
    document.dispatchEvent(new CustomEvent('chainos:demo-reset'));
  });
  exportButton.addEventListener('click', () => {
    const rows = [['Decision', 'Status', 'Time'], ...readActivity().map((entry) => [entry.label, entry.status || 'Queued', entry.time])];
    const blob = new Blob([`${rows.map((row) => row.map(csvValue).join(',')).join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
    const download = document.createElement('a'); download.href = URL.createObjectURL(blob); download.download = 'chainos-planner-activity.csv';
    document.body.appendChild(download); download.click(); download.remove(); window.setTimeout(() => URL.revokeObjectURL(download.href), 0);
    showToast('Planner activity exported as CSV.');
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  list.addEventListener('click', (event) => {
    const approveButton = event.target.closest('[data-activity-approve]');
    if (approveButton) {
      const entries = readActivity();
      const index = Number(approveButton.dataset.activityApprove);
      if (!entries[index] || entries[index].status === 'Approved') return;
      entries[index].status = 'Approved';
      writeActivity(entries); renderActivity();
      document.dispatchEvent(new CustomEvent('chainos:activity-approval', { detail: { label: entries[index].label } }));
      showToast('Planner action approved for execution.');
      return;
    }
    const statusButton = event.target.closest('[data-activity-index]');
    if (!statusButton) return;
    const entries = readActivity();
    const index = Number(statusButton.dataset.activityIndex);
    if (!entries[index]) return;
    entries[index].status = entries[index].status === 'Reviewed' ? 'Queued' : 'Reviewed';
    writeActivity(entries); renderActivity();
    showToast(entries[index].status === 'Reviewed' ? 'Activity marked reviewed.' : 'Activity returned to the queue.');
  });
  document.addEventListener('click', (event) => {
    const action = event.target.closest('#accept-action, #drawer-action');
    if (!action || action.disabled) return;
    const label = action.id === 'accept-action' ? 'Expedite PO-8421 recommendation' : action.textContent.replace('→', '').trim();
    recordActivity(label);
  });
  document.addEventListener('chainos:activity', (event) => { if (event.detail?.label) recordActivity(event.detail.label); });
}());
