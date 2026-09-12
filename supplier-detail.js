(function () {
  const details = {
    'Apex Metals': { region: 'US Midwest', reliability: '98%', commitment: '2 active POs · 1,200 inverter housings', signal: 'On schedule', note: 'Primary source for MAT-2048. Air expedite is available on the current inbound.' },
    'Nordic Circuits': { region: 'Northern Europe', reliability: '71%', commitment: '1 active PO · 600 control units', signal: 'ETA slipped Sep 17 → Sep 19', note: 'Confirm the revised ETA and protect an alternate lane before cover reaches the floor.' },
    'Vektor Plastics': { region: 'US West', reliability: '94%', commitment: '1 active PO · 900 cooling manifolds', signal: 'On schedule', note: 'Healthy lane with no current production constraint.' }
  };

  document.body.insertAdjacentHTML('beforeend', '<div class="supplier-detail-backdrop" id="supplier-detail-backdrop"></div><section class="supplier-detail" id="supplier-detail" aria-hidden="true" role="dialog" aria-labelledby="supplier-detail-title"><button class="supplier-detail-close" id="supplier-detail-close" aria-label="Close supplier detail">×</button><div class="drawer-kicker">SUPPLIER DETAIL</div><h2 id="supplier-detail-title">Supplier</h2><p class="supplier-detail-region" id="supplier-detail-region"></p><div class="supplier-detail-grid"><div><small>Reliability</small><strong id="supplier-detail-reliability"></strong></div><div><small>Current signal</small><strong id="supplier-detail-signal"></strong></div></div><div class="supplier-detail-section"><div class="drawer-label">Active commitment</div><p id="supplier-detail-commitment"></p></div><div class="supplier-detail-section"><div class="drawer-label">Planner note</div><div class="supplier-detail-note" id="supplier-detail-note"></div></div><div class="supplier-detail-foot">Fixture-backed profile · event history arrives in Phase 2 integrations</div></section>');
  const panel = document.getElementById('supplier-detail');
  const backdrop = document.getElementById('supplier-detail-backdrop');
  const closeButton = document.getElementById('supplier-detail-close');
  function close() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }
  function open(name) {
    const detail = details[name] || details['Apex Metals'];
    document.getElementById('supplier-detail-title').textContent = name;
    document.getElementById('supplier-detail-region').textContent = detail.region;
    document.getElementById('supplier-detail-reliability').textContent = detail.reliability;
    document.getElementById('supplier-detail-signal').textContent = detail.signal;
    document.getElementById('supplier-detail-commitment').textContent = detail.commitment;
    document.getElementById('supplier-detail-note').textContent = detail.note;
    panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show');
  }
  function enhanceRows() {
    const table = document.querySelector('.secondary-view .data-table');
    if (!table || !table.querySelector('th')?.textContent.includes('Supplier')) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      if (row.dataset.detailReady) return;
      row.dataset.detailReady = 'true'; row.tabIndex = 0; row.classList.add('interactive-row');
      const name = row.cells[0]?.textContent.trim() || 'Supplier';
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
