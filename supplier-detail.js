(function () {
  const details = {
    'Apex Metals': { region: 'US Midwest', reliability: '98%', commitment: '2 active POs · 1,200 inverter housings', signal: 'On schedule', note: 'Primary source for MAT-2048. Air expedite is available on the current inbound.', events: [['PO confirmed', 'PO-8421 · 1,200 housings', 'Sep 12', 'complete'], ['Shipment in transit', 'SHP-8421 · truck · ETA Sep 18', 'Sep 15', 'complete']] },
    'Nordic Circuits': { region: 'Northern Europe', reliability: '71%', commitment: '1 active PO · 600 control units', signal: 'ETA slipped Sep 17 → Sep 19', note: 'Confirm the revised ETA and protect an alternate lane before cover reaches the floor.', events: [['PO confirmed', 'PO-8398 · 600 control units', 'Sep 10', 'complete'], ['ETA slipped by 2 days', 'SHP-8398 · air · now Sep 19', 'Today', 'alert']] },
    'Vektor Plastics': { region: 'US West', reliability: '94%', commitment: '1 active PO · 900 cooling manifolds', signal: 'On schedule', note: 'Healthy lane with no current production constraint.', events: [['PO confirmed', 'PO-8410 · 900 manifolds', 'Sep 13', 'complete'], ['Shipment on schedule', 'SHP-8410 · truck · ETA Sep 20', 'Sep 15', 'complete']] }
  };

  document.body.insertAdjacentHTML('beforeend', '<div class="supplier-detail-backdrop" id="supplier-detail-backdrop"></div><section class="supplier-detail" id="supplier-detail" aria-hidden="true" role="dialog" aria-labelledby="supplier-detail-title"><button class="supplier-detail-close" id="supplier-detail-close" aria-label="Close supplier detail">×</button><div class="drawer-kicker">SUPPLIER DETAIL</div><h2 id="supplier-detail-title">Supplier</h2><p class="supplier-detail-region" id="supplier-detail-region"></p><div class="supplier-detail-grid"><div><small>Reliability</small><strong id="supplier-detail-reliability"></strong></div><div><small>Current signal</small><strong id="supplier-detail-signal"></strong></div></div><div class="supplier-detail-section"><div class="drawer-label">Active commitment</div><p id="supplier-detail-commitment"></p></div><div class="supplier-detail-section"><div class="drawer-label">Recent events</div><div class="supplier-event-list" id="supplier-event-list"></div></div><div class="supplier-detail-section"><div class="drawer-label">Planner note</div><div class="supplier-detail-note" id="supplier-detail-note"></div></div><div class="supplier-detail-foot">Fixture-backed profile · live event history arrives in Phase 2 integrations</div></section>');
  const panel = document.getElementById('supplier-detail');
  const backdrop = document.getElementById('supplier-detail-backdrop');
  const closeButton = document.getElementById('supplier-detail-close');
  function fixtureDetail(name) {
    const fixture = window.chainosFixture;
    const supplier = fixture?.suppliers?.find((entry) => entry.name === name || entry.id === name);
    if (!supplier) return null;
    const purchaseOrders = (fixture.purchaseOrders || []).filter((po) => po.supplierId === supplier.id);
    const shipments = fixture.shipments || [];
    const events = [];
    purchaseOrders.slice(0, 2).forEach((po) => {
      const quantity = Number(po.quantity);
      const quantityLabel = Number.isFinite(quantity) ? quantity.toLocaleString('en-US') : String(po.quantity || '—');
      events.push(['PO confirmed', `${po.id} · ${quantityLabel} units`, po.dueDate || 'Current', 'complete']);
      const shipment = shipments.find((entry) => entry.purchaseOrderId === po.id);
      if (shipment) {
        const atRisk = shipment.status === 'late';
        events.push([atRisk ? 'ETA at risk' : 'Shipment scheduled', `${shipment.id} · ${shipment.mode || 'inbound'} · ETA ${shipment.eta || 'pending'}`, shipment.eta || 'Current', atRisk ? 'alert' : 'complete']);
      }
    });
    const latestShipment = shipments.find((shipment) => purchaseOrders.some((po) => po.id === shipment.purchaseOrderId));
    const atRisk = latestShipment?.status === 'late' || supplier.status === 'watch';
    return {
      region: supplier.region || '—',
      reliability: `${supplier.reliabilityScore ?? '—'}%`,
      commitment: `${purchaseOrders.length} active PO${purchaseOrders.length === 1 ? '' : 's'}`,
      signal: atRisk ? 'At risk' : 'On schedule',
      note: atRisk ? `Confirm the revised ETA for ${latestShipment?.id || supplier.name}.` : 'Healthy lane with no current production constraint.',
      events
    };
  }
  function renderEvents(events) {
    const list = document.getElementById('supplier-event-list');
    list.replaceChildren(...events.map((event) => {
      const wrapper = document.createElement('div'); wrapper.className = `supplier-event ${event[3]}`;
      const dot = document.createElement('span'); dot.className = 'supplier-event-dot'; dot.textContent = event[3] === 'alert' ? '!' : '✓';
      const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = event[0]; const description = document.createElement('small'); description.textContent = event[1]; info.append(title, description);
      const time = document.createElement('time'); time.textContent = event[2];
      wrapper.append(dot, info, time); return wrapper;
    }));
  }
  function close() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }
  function open(name) {
    const detail = fixtureDetail(name) || details[name] || details['Apex Metals'];
    document.getElementById('supplier-detail-title').textContent = name;
    document.getElementById('supplier-detail-region').textContent = detail.region;
    document.getElementById('supplier-detail-reliability').textContent = detail.reliability;
    document.getElementById('supplier-detail-signal').textContent = detail.signal;
    document.getElementById('supplier-detail-commitment').textContent = detail.commitment;
    renderEvents(detail.events);
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
