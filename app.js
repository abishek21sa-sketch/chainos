const drawer = document.getElementById('detail-drawer');
const backdrop = document.getElementById('drawer-backdrop');
const toast = document.getElementById('toast');
const toastCopy = document.getElementById('toast-copy');
let activeFixture = null;
let activeDrawerType = 'shortage';

const fixtures = {
  shortage: { kicker: 'CRITICAL MATERIAL', title: 'Inverter housing shortage', intro: 'A constrained component is projected to interrupt production at Northstar Austin.', material: 'MAT-2048 · Inverter housing', cover: '1.8 days cover', floor: '2.0 days', progress: '28%', plant: 'Austin · Assembly line 2', line: 'EV platform / 240 units per shift', hours: '18.4 hrs', action: 'Expedite PO-8421', actionCopy: 'Air freight 480 housings from Apex Metals. Keeps coverage above safety floor.', trace: '<div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Apex Metals confirmed</strong><small>PO-8421 · 1,200 housings</small></div><time>Sep 12</time></div><div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Shipment in transit</strong><small>SHP-8421 · truck · ETA Sep 18</small></div><time>Sep 15</time></div><div class="trace-item alert"><span class="trace-dot">!</span><div><strong>Safety floor breach projected</strong><small>MAT-2048 · Austin line 2</small></div><time>Today</time></div><div class="trace-item proposed"><span class="trace-dot">↯</span><div><strong>Expedite available</strong><small>Air freight · +$4,280 estimate</small></div><time>Next</time></div>' },
  late: { kicker: 'SHIPMENT AT RISK', title: 'Nordic Circuits shipment late', intro: 'A late inbound is compressing cover for the vehicle control unit build plan.', material: 'VCU-1190 · Vehicle control unit', cover: '4.4 days cover', floor: '5.0 days', progress: '64%', plant: 'Austin · Assembly line 1', line: 'Vehicle controls / 180 units per shift', hours: '6.0 hrs', action: 'Confirm revised ETA', actionCopy: 'Ask Nordic Circuits to confirm the Sep 19 ETA and reserve an alternate air lane.', trace: '<div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Nordic Circuits confirmed</strong><small>PO-8398 · 600 control units</small></div><time>Sep 10</time></div><div class="trace-item alert"><span class="trace-dot">!</span><div><strong>ETA slipped by 2 days</strong><small>SHP-8398 · air · now Sep 19</small></div><time>Today</time></div><div class="trace-item alert"><span class="trace-dot">!</span><div><strong>Cover approaching floor</strong><small>VCU-1190 · Austin line 1</small></div><time>+2 days</time></div><div class="trace-item proposed"><span class="trace-dot">↗</span><div><strong>Supplier confirmation needed</strong><small>Protect the alternate lane before breach</small></div><time>Next</time></div>' }
};

fixtures.healthy = { kicker: 'HEALTHY FLOW', title: 'Vektor Plastics on schedule', intro: 'The cooling-manifold lane is healthy and does not currently constrain production.', material: 'PLS-7782 · Cooling manifold', cover: '12.4 days cover', floor: '7.0 days', progress: '88%', plant: 'Reno · Power systems', line: 'Power systems / 180 units per shift', hours: '0 hrs', action: 'No action required', actionCopy: 'Supplier reliability is 94% and the next inbound remains inside the committed window.', trace: '<div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Vektor Plastics confirmed</strong><small>PO-8410 · 900 manifolds</small></div><time>Sep 13</time></div><div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Shipment on schedule</strong><small>SHP-8410 · truck · ETA Sep 20</small></div><time>Sep 15</time></div><div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Safety floor protected</strong><small>PLS-7782 · Reno power systems</small></div><time>Today</time></div>' };

function showDrawer(type = 'shortage') {
  const item = fixtures[type] || fixtures.shortage;
  activeDrawerType = type;
  document.dispatchEvent(new CustomEvent('chainos:drawer-open', { detail: { type } }));
  document.getElementById('drawer-kicker').textContent = item.kicker;
  document.getElementById('drawer-title').textContent = item.title;
  document.getElementById('drawer-intro').textContent = item.intro;
  document.getElementById('drawer-material').textContent = item.material;
  document.getElementById('drawer-dos').textContent = item.cover;
  document.getElementById('drawer-floor').textContent = item.floor;
  document.getElementById('drawer-progress').style.width = item.progress;
  document.getElementById('drawer-plant').textContent = item.plant;
  document.getElementById('drawer-line-detail').textContent = item.line;
  document.getElementById('drawer-hours').textContent = item.hours;
  document.getElementById('drawer-trace').innerHTML = item.trace;
  document.getElementById('drawer-suggestion-title').textContent = item.action;
  document.getElementById('drawer-suggestion-copy').textContent = item.actionCopy;
  document.getElementById('drawer-action').innerHTML = `${type === 'late' ? 'Queue confirmation request' : 'Queue expedite request'} <span>→</span>`;
  document.getElementById('drawer-action').disabled = type === 'healthy';
  if (type === 'healthy') document.getElementById('drawer-action').innerHTML = 'No action required <span>✓</span>';
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show');
}
function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }
function showToast(message) { toastCopy.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3500); }
const syncStatus = document.getElementById('sync-status');
const syncPopover = document.getElementById('sync-popover');
function toggleSyncPopover() { const open = syncPopover.classList.toggle('open'); syncPopover.setAttribute('aria-hidden', String(!open)); }
syncStatus.addEventListener('click', toggleSyncPopover);
document.addEventListener('click', (event) => { if (!syncPopover.contains(event.target) && !syncStatus.contains(event.target)) { syncPopover.classList.remove('open'); syncPopover.setAttribute('aria-hidden', 'true'); } });
const scenarioModal = document.getElementById('scenario-modal');
const scenarioBackdrop = document.getElementById('scenario-backdrop');
let scenarioReady = false;
function openScenario() {
  scenarioReady = false;
  document.querySelector('.scenario-modal-intro').textContent = 'Compare one planner move against the current baseline before committing it.';
  document.getElementById('scenario-run').innerHTML = 'Run preview <span>→</span>';
  scenarioModal.classList.add('open'); scenarioModal.setAttribute('aria-hidden', 'false'); scenarioBackdrop.classList.add('show');
}
function closeScenario() { scenarioModal.classList.remove('open'); scenarioModal.setAttribute('aria-hidden', 'true'); scenarioBackdrop.classList.remove('show'); }
function runScenario() {
  if (!scenarioReady) {
    scenarioReady = true;
    document.querySelector('.scenario-modal-intro').textContent = 'Preview complete. Review the impact, then queue this plan for planner review.';
    document.getElementById('scenario-run').innerHTML = 'Queue plan <span>✓</span>';
    showToast('Preview complete: 3.8 days cover and 18.4 hours protected.');
    return;
  }
  scenarioReady = false;
  sessionStorage.setItem('chainos-scenario-status', 'queued');
  document.dispatchEvent(new CustomEvent('chainos:activity', { detail: { label: 'Scenario plan · Expedite PO-8421' } }));
  closeScenario();
  showToast('Scenario plan queued for planner review.');
}

async function loadFixture() {
  const syncLabel = document.getElementById('sync-label');
  syncLabel.textContent = 'Loading fixture…';
  const persistedImport = sessionStorage.getItem('chainos-imported-fixture');
  if (persistedImport) {
    try {
      document.dispatchEvent(new CustomEvent('chainos:fixture-import', { detail: { fixture: JSON.parse(persistedImport), fileName: 'session snapshot' } }));
      return;
    } catch (error) {
      sessionStorage.removeItem('chainos-imported-fixture');
    }
  }
  try {
    const response = await fetch('data/fixture.json');
    if (!response.ok) throw new Error(`Fixture request failed: ${response.status}`);
    activeFixture = await response.json();
    syncLabel.textContent = 'Synced 2 min ago';
    syncStatus.classList.remove('fallback');
    const shortages = activeFixture.shortages || [];
    document.getElementById('sync-supplier-count').textContent = `${(activeFixture.suppliers || []).length} / ${(activeFixture.purchaseOrders || []).length}`;
    if (activeFixture.asOf) document.getElementById('sync-as-of').textContent = new Date(activeFixture.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('risk-count').textContent = String(shortages.length).padStart(2, '0');
    const primaryShortage = shortages[0];
    if (primaryShortage) {
      document.getElementById('drawer-dos').textContent = `${primaryShortage.daysOfSupply} days cover`;
      document.getElementById('drawer-hours').textContent = `${primaryShortage.affectedHours} hrs`;
    }
    const footer = document.querySelector('.footer-note span');
    if (footer && activeFixture.workspace) footer.textContent = `ChainOS Phase 1 · ${activeFixture.workspace} fixture`;
    const activeView = document.querySelector('.nav-item.active')?.dataset.view;
    if (activeView && activeView !== 'overview') renderView(activeView);
  } catch (error) {
    // The page remains usable when opened directly from disk; the visible defaults are the same fixture values.
    syncLabel.textContent = 'Demo fixture inline';
    syncStatus.classList.add('fallback');
    console.info('Using inline fixture defaults.', error.message);
  }
}

document.addEventListener('chainos:fixture-import', (event) => {
  const fixture = event.detail?.fixture;
  if (!fixture) return;
  activeFixture = fixture;
  sessionStorage.setItem('chainos-imported-fixture', JSON.stringify(fixture));
  document.getElementById('sync-label').textContent = `Imported ${event.detail.fileName || 'fixture'}`;
  syncStatus.classList.remove('fallback');
  const shortages = fixture.shortages || [];
  document.getElementById('sync-supplier-count').textContent = `${(fixture.suppliers || []).length} / ${(fixture.purchaseOrders || []).length}`;
  if (fixture.asOf) document.getElementById('sync-as-of').textContent = new Date(fixture.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('risk-count').textContent = String(shortages.length).padStart(2, '0');
  const primaryShortage = shortages[0];
  if (primaryShortage) {
    document.getElementById('drawer-dos').textContent = `${primaryShortage.daysOfSupply} days cover`;
    document.getElementById('drawer-hours').textContent = `${primaryShortage.affectedHours} hrs`;
  }
  const footer = document.querySelector('.footer-note span');
  if (footer && fixture.workspace) footer.textContent = `ChainOS Phase 2 · ${fixture.workspace} import`;
  const activeView = document.querySelector('.nav-item.active')?.dataset.view;
  if (activeView && activeView !== 'overview') renderView(activeView);
  showToast(`Imported ${event.detail.fileName || 'fixture'} — ${fixture.suppliers.length} suppliers, ${fixture.purchaseOrders.length} POs.`);
});

document.addEventListener('chainos:activity-approval', (event) => {
  if (!event.detail?.label?.includes('Expedite')) return;
  sessionStorage.setItem('chainos-action-status', 'approved');
  const actionButton = document.getElementById('accept-action');
  actionButton.innerHTML = 'Expedite approved <span>✓</span>';
  actionButton.classList.add('queued');
  document.querySelector('.action-panel')?.classList.add('action-queued');
  document.querySelector('.queue-item.critical .queue-status span:nth-child(2)')?.replaceChildren(document.createTextNode('Approved'));
  document.querySelector('.queue-item.critical')?.classList.add('action-queued');
});

document.addEventListener('chainos:resolution', (event) => {
  const type = event.detail?.type;
  const resolved = event.detail?.status === 'resolved';
  if (!type || type === 'healthy') return;
  const item = document.querySelector(`.queue-item.${type === 'late' ? 'warning' : 'critical'}`);
  if (item) {
    item.classList.toggle('resolved', resolved);
    item.querySelector('.queue-status span:nth-child(2)')?.replaceChildren(document.createTextNode(resolved ? 'Resolved' : (type === 'late' ? 'At risk' : 'Critical')));
  }
  if (type === 'shortage') document.getElementById('risk-count').textContent = resolved ? '00' : String((activeFixture?.shortages || [1]).length).padStart(2, '0');
  const activeQueueItems = Array.from(document.querySelectorAll('.queue-list .queue-item')).filter((queueItem) => !queueItem.classList.contains('resolved')).length;
  const queueCount = document.querySelector('.queue-count');
  if (queueCount) queueCount.textContent = String(activeQueueItems).padStart(2, '0');
});

document.addEventListener('chainos:demo-reset', () => {
  ['chainos-planner-activity', 'chainos-saved-views', 'chainos-planner-comments'].forEach((key) => localStorage.removeItem(key));
  ['chainos-action-status', 'chainos-late-action-status', 'chainos-scenario-status', 'chainos-owner-shortage', 'chainos-owner-late', 'chainos-resolution-shortage', 'chainos-resolution-late', 'chainos-imported-fixture'].forEach((key) => sessionStorage.removeItem(key));
  window.location.reload();
});

document.querySelectorAll('[data-open-drawer]').forEach((button) => button.addEventListener('click', () => showDrawer(button.dataset.openDrawer)));
document.querySelectorAll('.network-node').forEach((node) => {
  const nodeName = node.querySelector('strong')?.textContent || '';
  const drawerType = nodeName.includes('Nordic') ? 'late' : (nodeName.includes('Apex') || nodeName.includes('Austin')) ? 'shortage' : 'healthy';
  node.setAttribute('role', 'button'); node.tabIndex = 0;
  node.addEventListener('click', () => showDrawer(drawerType));
  node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDrawer(drawerType); } });
});
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
backdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
function markActionQueued(source = 'dashboard') {
  if (activeDrawerType === 'healthy') { if (source === 'drawer') closeDrawer(); showToast('Healthy flow confirmed. No planner action is required.'); return; }
  if (activeDrawerType === 'late') {
    sessionStorage.setItem('chainos-late-action-status', 'queued');
    document.querySelector('.queue-item.warning .queue-status span:nth-child(2)')?.replaceChildren(document.createTextNode('Queued'));
    document.querySelector('.queue-item.warning')?.classList.add('action-queued');
  }
  if (activeDrawerType === 'shortage' || source === 'dashboard') {
    sessionStorage.setItem('chainos-action-status', 'queued');
    document.getElementById('risk-count').textContent = '03';
    const actionButton = document.getElementById('accept-action');
    actionButton.innerHTML = 'Expedite queued <span>✓</span>';
    actionButton.classList.add('queued');
    document.querySelector('.action-panel')?.classList.add('action-queued');
    document.querySelector('.queue-item.critical .queue-status span:nth-child(2)')?.replaceChildren(document.createTextNode('Queued'));
  }
  if (source === 'drawer') closeDrawer();
  const message = activeDrawerType === 'late' ? 'Supplier confirmation request queued for planner review.' : (source === 'drawer' ? 'Expedite request queued for planner review.' : 'Recommendation accepted. PO-8421 is queued for expediting.');
  showToast(message);
}
document.getElementById('accept-action').addEventListener('click', () => markActionQueued());
document.getElementById('drawer-action').addEventListener('click', () => markActionQueued('drawer'));
document.getElementById('inspect-action').addEventListener('click', () => showDrawer('shortage'));
let queueExpanded = false;
let queueFilter = 'all';
function getQueueKind(item) {
  if (item.textContent.includes('SHP-') || item.textContent.includes('shipment') || item.textContent.includes('Truck') || item.textContent.includes('Air freight')) return 'inbound';
  return item.classList.contains('critical') ? 'critical' : 'other';
}
function applyQueueFilter() {
  document.querySelectorAll('.queue-item').forEach((item) => {
    const visible = queueFilter === 'all' || getQueueKind(item) === queueFilter;
    item.hidden = !visible;
  });
}
document.querySelectorAll('.queue-filter').forEach((filter) => filter.addEventListener('click', () => {
  document.querySelectorAll('.queue-filter').forEach((button) => button.classList.remove('active'));
  filter.classList.add('active'); queueFilter = filter.dataset.queueFilter; applyQueueFilter();
}));
document.getElementById('view-queue').addEventListener('click', () => {
  const list = document.querySelector('.queue-list');
  const footer = document.getElementById('view-queue');
  if (!queueExpanded) {
    list.insertAdjacentHTML('beforeend', '<button class="queue-item warning extra-signal" data-open-drawer="late"><div class="queue-status"><span class="status-icon">↗</span><span>Watch</span><time>Yesterday</time></div><strong>Carrier handoff not confirmed</strong><p>Awaiting milestone update for <b>PO-8410</b></p><div class="queue-meta"><span>SHP-8410</span><span>·</span><span>Truck</span><span class="arrow">→</span></div></button><button class="queue-item critical extra-signal" data-open-drawer="shortage"><div class="queue-status"><span class="status-icon">!</span><span>Watch</span><time>Yesterday</time></div><strong>Safety stock below target</strong><p>Reno buffer is trending below its <b>7-day floor</b></p><div class="queue-meta"><span>PLS-7782</span><span>·</span><span>Reno</span><span class="arrow">→</span></div></button>');
    document.querySelectorAll('.extra-signal[data-open-drawer]').forEach((button) => button.addEventListener('click', () => showDrawer(button.dataset.openDrawer)));
    applyQueueFilter();
    queueExpanded = true; footer.innerHTML = 'Collapse queue <span>↑</span>'; showToast('Queue expanded — 4 lower-priority signals remain.');
  } else {
    document.querySelectorAll('.extra-signal').forEach((signal) => signal.remove());
    queueExpanded = false; footer.innerHTML = 'View all 6 signals <span>→</span>';
  }
});
document.getElementById('scenario-button').addEventListener('click', openScenario);
document.getElementById('scenario-close').addEventListener('click', closeScenario);
document.getElementById('scenario-cancel').addEventListener('click', closeScenario);
document.getElementById('scenario-run').addEventListener('click', runScenario);
scenarioBackdrop.addEventListener('click', closeScenario);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeScenario(); });
document.querySelector('.icon-button:not(#notification-button)').addEventListener('click', () => showDrawer('shortage'));
document.querySelector('.network-panel .text-button').addEventListener('click', () => showToast('Network view is anchored on the active Austin constraint.'));

const viewCopy = {
  overview: ['Good morning, Alex', 'Here’s the network picture. One decision needs your attention.'],
  materials: ['Materials watchlist', 'Four components are shaping this week’s production outlook.'],
  suppliers: ['Supplier performance', 'See reliability, commitments, and emerging risk across the network.'],
  'purchase-orders': ['Purchase order commitments', 'Twelve open commitments need confirmation this week.'],
  logistics: ['Logistics monitor', 'Inbound lanes are moving, with one shipment requiring a plan.'],
  inventory: ['Inventory position', 'Coverage is healthy overall; Austin line 2 is the exception.'],
  constraints: ['Constraint board', 'One hard constraint is currently gating production continuity.'],
  scenarios: ['Scenario workspace', 'Model an action before you commit it to the network.']
};
function renderView(view) {
  const host = document.getElementById('secondary-view');
  if (view === 'overview') { host.classList.add('hidden'); host.innerHTML = ''; return; }
  host.classList.remove('hidden');
  const f = activeFixture || { suppliers: [], purchaseOrders: [], shortages: [] };
  const shortage = f.shortages[0] || { daysOfSupply: 1.8, affectedHours: 18.4 };
  if (view === 'materials' || view === 'inventory') {
    host.innerHTML = `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">${view === 'materials' ? 'MATERIALS WATCHLIST' : 'INVENTORY POSITION'}</div><h2>${view === 'materials' ? 'Components shaping the plan' : 'Coverage by critical component'}</h2></div><div class="panel-filter">Week 38 <span>⌄</span></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Material</th><th>Plant</th><th>Cover</th><th>Safety floor</th><th>Signal</th></tr></thead><tbody><tr><td class="table-primary">MAT-2048 · Inverter housing</td><td>Austin L2</td><td class="critical-text">${shortage.daysOfSupply} days</td><td>2.0 days</td><td><span class="table-status critical">Critical</span></td></tr><tr><td class="table-primary">VCU-1190 · Vehicle control unit</td><td>Austin L1</td><td>8.7 days</td><td>5.0 days</td><td><span class="table-status good">Healthy</span></td></tr><tr><td class="table-primary">PLS-7782 · Cooling manifold</td><td>Reno P1</td><td>12.4 days</td><td>7.0 days</td><td><span class="table-status good">Healthy</span></td></tr></tbody></table></div></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">EXCEPTION LOGIC</div><h2>Why MAT-2048 is flagged</h2></div></div><div class="mini-insight"><div class="mini-insight-top"><strong>Projected breach</strong><span>${shortage.daysOfSupply} days</span></div><p>Usable on-hand falls below the 2-day safety floor before PO-8421 arrives on Sep 18.</p><div class="metric-line amber"><span style="width:28%"></span></div></div><div class="mini-insight"><div class="mini-insight-top"><strong>Production exposure</strong><span>${shortage.affectedHours} hrs</span></div><p>Austin assembly line 2 consumes 240 housings per shift against the current allocation.</p></div><div class="view-callout"><div class="view-callout-icon">↯</div><div><strong>Planner move available</strong><p>Expedite the existing PO instead of creating a new source.</p></div></div></article>`;
  } else if (view === 'suppliers') {
    const rows = f.suppliers.map((s) => `<tr><td class="table-primary">${s.name}</td><td>${s.region}</td><td>${s.reliabilityScore}%</td><td><span class="table-status ${s.status === 'watch' ? 'watch' : 'good'}">${s.status === 'watch' ? 'Watch' : 'Healthy'}</span></td><td>${s.status === 'watch' ? '1 late shipment' : 'On schedule'}</td></tr>`).join('');
    host.innerHTML = `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">SUPPLIER PERFORMANCE</div><h2>Reliability and commitments</h2></div><button class="text-button">Export view <span>↓</span></button></div><table class="data-table"><thead><tr><th>Supplier</th><th>Region</th><th>Reliability</th><th>Status</th><th>Current signal</th></tr></thead><tbody>${rows}</tbody></table></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">NETWORK NOTE</div><h2>One supplier needs a plan</h2></div></div><div class="view-callout"><div class="view-callout-icon">!</div><div><strong>Nordic Circuits · 71% reliability</strong><p>PO-8398 moved from Sep 17 to Sep 19. Review the inbound before the next planning run.</p></div></div></article>`;
  } else if (view === 'purchase-orders' || view === 'logistics') {
    const rows = f.purchaseOrders.map((po) => `<tr><td class="table-id">${po.id}</td><td class="table-primary">${po.partId.replace('PART-', '')}</td><td>${po.quantity.toLocaleString()} ea</td><td>${po.dueDate}</td><td><span class="table-status ${po.status === 'at-risk' ? 'critical' : 'open'}">${po.status === 'at-risk' ? 'At risk' : 'Open'}</span></td></tr>`).join('');
    host.innerHTML = `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">${view === 'logistics' ? 'INBOUND LOGISTICS' : 'PURCHASE ORDERS'}</div><h2>${view === 'logistics' ? 'Shipments in motion' : 'Open commercial commitments'}</h2></div><div class="panel-filter">All lanes <span>⌄</span></div></div><table class="data-table"><thead><tr><th>PO</th><th>Material</th><th>Quantity</th><th>Due</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">NEXT DECISION</div><h2>Inbound exception</h2></div></div><div class="mini-insight"><div class="mini-insight-top"><strong>PO-8421 · Apex Metals</strong><span>In transit</span></div><p>Truck ETA Sep 18. Air expedite is available with a +$4,280 cost delta.</p></div><div class="mini-insight"><div class="mini-insight-top"><strong>PO-8398 · Nordic Circuits</strong><span class="critical-text">Late</span></div><p>ETA slipped by 2 days. Vehicle control unit cover remains above floor for now.</p></div></article>`;
  } else if (view === 'constraints') {
    host.innerHTML = `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">CONSTRAINT BOARD</div><h2>Finite resources gating the plan</h2></div><span class="table-status critical">1 active</span></div><table class="data-table"><thead><tr><th>Constraint</th><th>Scope</th><th>Consumed</th><th>Window</th><th>Status</th></tr></thead><tbody><tr><td class="table-primary">Material availability</td><td>Austin · Line 2</td><td>432 / 480 ea</td><td>Sep 16–18</td><td><span class="table-status critical">Breaches floor</span></td></tr><tr><td class="table-primary">Power systems capacity</td><td>Reno · Line 1</td><td>68 / 180 units</td><td>Sep 16</td><td><span class="table-status good">Healthy</span></td></tr></tbody></table></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">CONSTRAINT RESPONSE</div><h2>Recover the floor</h2></div></div><div class="view-callout"><div class="view-callout-icon">↗</div><div><strong>Expedite recovers 480 units</strong><p>The proposed action removes the material constraint for the current planning window and protects ${shortage.affectedHours} production hours.</p></div></div></article>`;
  } else {
    host.innerHTML = `<article class="scenario-card"><div class="view-kicker">SCENARIO WORKSPACE · BETA</div><h2>Test a planner move before it reaches the network.</h2><p>Start with the active exception and compare service, cost, and coverage impacts. Scenario persistence and multi-echelon optimization are intentionally reserved for Phase 2.</p><div class="scenario-actions"><button class="primary-button small" id="scenario-start">Start with MAT-2048 <span>→</span></button><button class="secondary-button small">View assumptions</button></div></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">ACTIVE BASELINE</div><h2>Current decision context</h2></div></div><div class="mini-insight"><div class="mini-insight-top"><strong>Service protected</strong><span>+${shortage.affectedHours} hrs</span></div><p>Air expedite keeps Austin line 2 above its safety floor.</p></div><div class="mini-insight"><div class="mini-insight-top"><strong>Incremental cost</strong><span>+$4,280</span></div><p>Estimate is based on the fixture’s truck-to-air mode change.</p></div></article>`;
    document.getElementById('scenario-start').addEventListener('click', openScenario);
  }
}
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
  item.classList.add('active'); const copy = viewCopy[item.dataset.view];
  document.getElementById('page-title').textContent = copy[0]; document.getElementById('page-subtitle').textContent = copy[1];
  document.querySelector('.page-content').classList.toggle('view-mode', item.dataset.view !== 'overview');
  renderView(item.dataset.view);
  if (item.dataset.view !== 'overview') showToast(`${copy[0]} view selected.`);
}));

loadFixture();
if (sessionStorage.getItem('chainos-action-status') === 'queued') markActionQueued();
if (sessionStorage.getItem('chainos-action-status') === 'approved') { markActionQueued(); document.getElementById('accept-action').innerHTML = 'Expedite approved <span>✓</span>'; }
