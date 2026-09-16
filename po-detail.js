(function () {
  const details = {
    'PO-8421': { supplier: 'Apex Metals', material: 'MAT-2048 · Inverter housing', quantity: '1,200 ea', due: 'Sep 18, 2025', status: 'In transit', route: 'US Midwest → Austin, TX', milestones: [['Order confirmed', 'Apex Metals accepted the commitment', 'Sep 12', 'complete'], ['Picked up', 'SHP-8421 · truck departure', 'Sep 15', 'complete'], ['In transit', 'Northstar Austin destination', 'Today', 'complete'], ['Estimated arrival', 'Committed ETA · Sep 18', 'Next', 'proposed']], note: 'Air expedite is available for 480 housings and protects 18.4 hours of Austin line 2.' },
    'PO-8398': { supplier: 'Nordic Circuits', material: 'VCU-1190 · Vehicle control unit', quantity: '600 ea', due: 'Sep 19, 2025', status: 'At risk', route: 'Northern Europe → Austin, TX', milestones: [['Order confirmed', 'Nordic Circuits accepted the commitment', 'Sep 10', 'complete'], ['Departed origin', 'SHP-8398 · air lane', 'Sep 11', 'complete'], ['ETA slipped', 'Original commitment · Sep 17', 'Today', 'alert'], ['Revised arrival', 'Current ETA · Sep 19', 'Next', 'proposed']], note: 'ETA slipped by two days. Confirm the revised commitment before the alternate lane closes.' },
    'PO-8410': { supplier: 'Vektor Plastics', material: 'PLS-7782 · Cooling manifold', quantity: '900 ea', due: 'Sep 20, 2025', status: 'Open', route: 'US West → Reno, NV', milestones: [['Order confirmed', 'Vektor Plastics accepted the commitment', 'Sep 13', 'complete'], ['Shipment scheduled', 'SHP-8410 · truck lane', 'Sep 15', 'complete'], ['Estimated arrival', 'Committed ETA · Sep 20', 'Next', 'proposed']], note: 'Healthy inbound with no current production constraint.' }
  };

  document.body.insertAdjacentHTML('beforeend', '<div class="po-detail-backdrop" id="po-detail-backdrop"></div><section class="po-detail" id="po-detail" aria-hidden="true" role="dialog" aria-labelledby="po-detail-title"><button class="po-detail-close" id="po-detail-close" aria-label="Close purchase order detail">×</button><div class="drawer-kicker">PURCHASE ORDER DETAIL</div><h2 id="po-detail-title">PO</h2><p class="po-detail-supplier" id="po-detail-supplier"></p><div class="po-detail-grid"><div><small>Material</small><strong id="po-detail-material"></strong></div><div><small>Quantity</small><strong id="po-detail-quantity"></strong></div><div><small>Due date</small><strong id="po-detail-due"></strong></div><div><small>Status</small><strong id="po-detail-status"></strong></div></div><div class="po-detail-section"><div class="drawer-label">Inbound route</div><p id="po-detail-route"></p></div><div class="po-detail-section"><div class="drawer-label">Shipment milestones</div><div class="po-milestone-list" id="po-detail-milestones"></div></div><div class="po-detail-section"><div class="drawer-label">Planner note</div><div class="po-detail-note" id="po-detail-note"></div></div><div class="po-detail-foot">Fixture-backed commitment · milestone integration arrives in Phase 2</div></section>');
  const panel = document.getElementById('po-detail');
  const backdrop = document.getElementById('po-detail-backdrop');
  const closeButton = document.getElementById('po-detail-close');
  function close() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }
  function open(id) {
    const detail = details[id] || details['PO-8421'];
    document.getElementById('po-detail-title').textContent = id;
    document.getElementById('po-detail-supplier').textContent = detail.supplier;
    document.getElementById('po-detail-material').textContent = detail.material;
    document.getElementById('po-detail-quantity').textContent = detail.quantity;
    document.getElementById('po-detail-due').textContent = detail.due;
    document.getElementById('po-detail-status').textContent = detail.status;
    document.getElementById('po-detail-route').textContent = detail.route;
    document.getElementById('po-detail-milestones').innerHTML = detail.milestones.map((milestone) => `<div class="po-milestone ${milestone[3]}"><span class="po-milestone-dot"></span><div><strong>${milestone[0]}</strong><small>${milestone[1]}</small></div><time>${milestone[2]}</time></div>`).join('');
    document.getElementById('po-detail-note').textContent = detail.note;
    panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show');
  }
  function enhanceRows() {
    const table = document.querySelector('.secondary-view .data-table');
    if (!table || !table.querySelector('th')?.textContent.includes('PO')) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      if (row.dataset.poDetailReady) return;
      row.dataset.poDetailReady = 'true'; row.tabIndex = 0; row.classList.add('interactive-row');
      const id = row.cells[0]?.textContent.trim() || 'PO-8421';
      row.addEventListener('click', () => open(id));
      row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(id); } });
    });
  }
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  new MutationObserver(enhanceRows).observe(document.getElementById('secondary-view'), { childList: true, subtree: true });
  enhanceRows();
}());
