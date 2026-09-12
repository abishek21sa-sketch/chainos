(function () {
  const details = {
    'MAT-2048 · Inverter housing': { plant: 'Austin · Assembly line 2', cover: '1.8 days', floor: '2.0 days', demand: '240 units per shift', source: 'Apex Metals · PO-8421', signal: 'Critical', note: 'Projected to breach the safety floor before the current truck ETA. Air expedite is available.' },
    'VCU-1190 · Vehicle control unit': { plant: 'Austin · Assembly line 1', cover: '8.7 days', floor: '5.0 days', demand: '180 units per shift', source: 'Nordic Circuits · PO-8398', signal: 'Watch', note: 'Inbound is late, but current coverage remains above the safety floor.' },
    'PLS-7782 · Cooling manifold': { plant: 'Reno · Power systems', cover: '12.4 days', floor: '7.0 days', demand: '180 units per shift', source: 'Vektor Plastics · PO-8410', signal: 'Healthy', note: 'Coverage remains protected and the next inbound is on schedule.' }
  };

  document.body.insertAdjacentHTML('beforeend', '<div class="material-detail-backdrop" id="material-detail-backdrop"></div><section class="material-detail" id="material-detail" aria-hidden="true" role="dialog" aria-labelledby="material-detail-title"><button class="material-detail-close" id="material-detail-close" aria-label="Close material detail">×</button><div class="drawer-kicker">MATERIAL DETAIL</div><h2 id="material-detail-title">Material</h2><p class="material-detail-plant" id="material-detail-plant"></p><div class="material-detail-grid"><div><small>Days cover</small><strong id="material-detail-cover"></strong></div><div><small>Safety floor</small><strong id="material-detail-floor"></strong></div><div><small>Demand rate</small><strong id="material-detail-demand"></strong></div><div><small>Signal</small><strong id="material-detail-signal"></strong></div></div><div class="material-detail-section"><div class="drawer-label">Primary source</div><p id="material-detail-source"></p></div><div class="material-detail-section"><div class="drawer-label">Planner note</div><div class="material-detail-note" id="material-detail-note"></div></div><div class="material-detail-foot">Fixture-backed position · live inventory feeds arrive in Phase 2</div></section>');
  const panel = document.getElementById('material-detail');
  const backdrop = document.getElementById('material-detail-backdrop');
  const closeButton = document.getElementById('material-detail-close');
  function close() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }
  function open(name) {
    const detail = details[name] || details['MAT-2048 · Inverter housing'];
    document.getElementById('material-detail-title').textContent = name;
    document.getElementById('material-detail-plant').textContent = detail.plant;
    document.getElementById('material-detail-cover').textContent = detail.cover;
    document.getElementById('material-detail-floor').textContent = detail.floor;
    document.getElementById('material-detail-demand').textContent = detail.demand;
    const signalElement = document.getElementById('material-detail-signal');
    signalElement.textContent = detail.signal;
    signalElement.className = detail.signal === 'Critical' ? 'critical-signal' : detail.signal === 'Watch' ? 'watch-signal' : 'healthy-signal';
    document.getElementById('material-detail-source').textContent = detail.source;
    document.getElementById('material-detail-note').textContent = detail.note;
    panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show');
  }
  function enhanceRows() {
    const table = document.querySelector('.secondary-view .data-table');
    if (!table || !table.querySelector('th')?.textContent.includes('Material')) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      if (row.dataset.materialDetailReady) return;
      row.dataset.materialDetailReady = 'true'; row.tabIndex = 0; row.classList.add('interactive-row');
      const name = row.cells[0]?.textContent.trim() || 'MAT-2048 · Inverter housing';
      row.addEventListener('click', () => open(name));
      row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(name); } });
    });
  }
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  new MutationObserver(enhanceRows).observe(document.getElementById('secondary-view'), { childList: true, subtree: true });
  enhanceRows();
}());
