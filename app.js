const drawer = document.getElementById('detail-drawer');
const backdrop = document.getElementById('drawer-backdrop');
const toast = document.getElementById('toast');
const toastCopy = document.getElementById('toast-copy');
drawer.setAttribute('role', 'dialog');
drawer.setAttribute('aria-modal', 'true');
drawer.setAttribute('aria-labelledby', 'drawer-title');
let activeFixture = null;
let activeDrawerType = 'shortage';
let focusReturnTarget = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function setInlineCopy(element, before, emphasis, after = '') {
  if (!element) return;
  const strong = document.createElement('strong');
  strong.textContent = emphasis;
  element.replaceChildren(document.createTextNode(before), strong, document.createTextNode(after));
}

function focusableElements(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hidden && element.offsetParent !== null);
}

function focusOverlay(container) {
  focusReturnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  window.requestAnimationFrame(() => focusableElements(container)[0]?.focus());
}

function restoreFocus() {
  const target = focusReturnTarget;
  focusReturnTarget = null;
  if (target && document.contains(target)) target.focus();
}

function updateFixtureContext(fixture, sourceLabel = 'fixture.json') {
  const workspace = fixture?.workspace || 'Planning workspace';
  const workspaceName = document.querySelector('.workspace-copy strong');
  const sourceLabelNode = document.querySelector('.sync-popover-foot');
  if (workspaceName) workspaceName.textContent = workspace;
  if (sourceLabelNode) sourceLabelNode.textContent = `Source: ${workspace} · ${sourceLabel}`;
  const asOf = fixture?.asOf ? new Date(fixture.asOf) : null;
  let week = null;
  if (asOf && !Number.isNaN(asOf.getTime())) {
    const isoDate = new Date(Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate()));
    isoDate.setUTCDate(isoDate.getUTCDate() + 4 - (isoDate.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(isoDate.getUTCFullYear(), 0, 1));
    week = Math.ceil((((isoDate - yearStart) / 86400000) + 1) / 7);
    const eyebrow = document.querySelector('.eyebrow');
    if (eyebrow) eyebrow.innerHTML = `<span class="live-dot"></span>${asOf.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} <span class="eyebrow-separator">·</span> Week ${week}`;
  }
  const footerFixture = document.querySelector('.footer-note span:nth-child(2)');
  if (footerFixture) footerFixture.textContent = `Fixture: ${workspace}${week ? ` / Week ${week}` : ''}`;
}

function updateFixtureHealth(fixture) {
  const healthValues = document.querySelectorAll('#sync-popover .sync-detail b');
  const asOf = fixture?.asOf ? new Date(fixture.asOf) : null;
  const signalCollections = ['suppliers', 'purchaseOrders', 'shipments', 'shortages', 'constraints', 'plannerActions'];
  const evaluatedSignals = signalCollections.reduce((total, key) => total + (Array.isArray(fixture?.[key]) ? fixture[key].length : 0), 0);
  const signalCount = Number(fixture?.signalsEvaluated ?? evaluatedSignals);
  if (healthValues[0] && asOf && !Number.isNaN(asOf.getTime())) healthValues[0].textContent = asOf.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (healthValues[1]) healthValues[1].textContent = String(signalCount);
  const legendNote = document.querySelector('.network-legend .legend-note');
  if (legendNote) legendNote.textContent = `Updated from ${signalCount} signals`;
  const planningDate = asOf && !Number.isNaN(asOf.getTime()) ? asOf.toISOString().slice(0, 10) : null;
  const shipmentsToday = (fixture?.shipments || []).filter((shipment) => shipment.eta?.slice(0, 10) === planningDate).length;
  const openCommitments = (fixture?.purchaseOrders || []).filter((order) => !['closed', 'received', 'cancelled'].includes(order.status)).length;
  const stripValues = document.querySelectorAll('.bottom-strip .strip-item strong');
  if (stripValues[0]) stripValues[0].textContent = `${shipmentsToday} shipment${shipmentsToday === 1 ? '' : 's'} arriving today`;
  if (stripValues[1]) stripValues[1].textContent = `${openCommitments} PO${openCommitments === 1 ? '' : 's'} need confirmation`;
  if (stripValues[2] && healthValues[0]) stripValues[2].textContent = `${healthValues[0].textContent} · ${signalCount} signals evaluated`;
  const metricValues = document.querySelectorAll('.metric-grid .metric-value');
  const exposureHours = (fixture?.shortages || []).reduce((total, shortage) => total + (Number(shortage.affectedHours) || 0), 0);
  const lateShipments = (fixture?.shipments || []).filter((shipment) => shipment.status === 'late').length;
  const queueCounts = { all: (fixture?.shortages || []).length + lateShipments, critical: (fixture?.shortages || []).length, inbound: lateShipments };
  const coverSamples = (fixture?.inventoryPositions || []).map((position) => {
    const demand = (fixture?.demandSignals || []).find((signal) => signal.plantId === position.plantId && signal.partId === position.partId);
    if (!demand || !Number.isFinite(Number(demand.quantity))) return null;
    const [start, end] = String(demand.period || '').split('/').map((value) => new Date(value));
    const periodDays = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) ? Math.max(1, Math.round((end - start) / 86400000) + 1) : 1;
    const dailyDemand = Number(demand.quantity) / periodDays;
    const available = Number(position.onHand) - Number(position.allocated || 0);
    return dailyDemand > 0 ? available / dailyDemand : null;
  }).filter((value) => Number.isFinite(value));
  const networkCover = Number(fixture?.networkCoverDays) || (coverSamples.length ? coverSamples.reduce((total, value) => total + value, 0) / coverSamples.length : null);
  if (metricValues[1]?.firstChild) metricValues[1].firstChild.textContent = exposureHours.toFixed(1);
  if (metricValues[2]) metricValues[2].textContent = String(lateShipments).padStart(2, '0');
  if (metricValues[3]?.firstChild && Number.isFinite(networkCover)) metricValues[3].firstChild.textContent = networkCover.toFixed(1);
  document.querySelectorAll('.queue-filter').forEach((filter) => {
    const count = queueCounts[filter.dataset.queueFilter];
    if (Number.isFinite(count)) filter.querySelector('span')?.replaceChildren(document.createTextNode(String(count).padStart(2, '0')));
  });
  const queueCount = document.querySelector('.queue-count');
  if (queueCount) queueCount.textContent = String(queueCounts.all).padStart(2, '0');
  const queueFooter = document.getElementById('view-queue');
  if (queueFooter && !queueExpanded) queueFooter.innerHTML = `View all ${signalCount} signals <span>→</span>`;
  const supplierCount = Array.isArray(fixture?.suppliers) ? fixture.suppliers.length : 0;
  const plantCount = Array.isArray(fixture?.plants) ? fixture.plants.length : 0;
  const laneCount = Array.isArray(fixture?.shipments) ? fixture.shipments.length : 0;
  document.querySelector('.supplier-stage .stage-label span')?.replaceChildren(document.createTextNode(String(supplierCount).padStart(2, '0')));
  document.querySelector('.plant-stage .stage-label span')?.replaceChildren(document.createTextNode(String(plantCount).padStart(2, '0')));
  const flowBadge = document.querySelector('.flow-badge');
  if (flowBadge) flowBadge.textContent = `${laneCount} lane${laneCount === 1 ? '' : 's'}`;
  const coverageBreach = document.querySelector('.coverage-foot strong');
  const primaryShortage = fixture?.shortages?.[0];
  if (coverageBreach && primaryShortage) coverageBreach.textContent = `Next breach in ${primaryShortage.daysOfSupply} days`;
  document.querySelectorAll('.supplier-stage .network-node').forEach((node, index) => {
    const supplier = fixture?.suppliers?.[index];
    node.hidden = !supplier;
    if (!supplier) return;
    const poCount = (fixture.purchaseOrders || []).filter((order) => order.supplierId === supplier.id).length;
    const lateCount = (fixture.shipments || []).filter((shipment) => shipment.status === 'late' && fixture.purchaseOrders?.some((order) => order.id === shipment.purchaseOrderId && order.supplierId === supplier.id)).length;
    node.classList.toggle('node-warning', supplier.status !== 'healthy' || lateCount > 0);
    node.querySelector('strong')?.replaceChildren(document.createTextNode(supplier.name));
    node.querySelector('small')?.replaceChildren(document.createTextNode(lateCount ? `${lateCount} late shipment${lateCount === 1 ? '' : 's'}` : `${poCount} active PO${poCount === 1 ? '' : 's'}`));
    node.querySelector('b')?.replaceChildren(document.createTextNode(`${supplier.reliabilityScore ?? '—'}%`));
  });
  document.querySelectorAll('.plant-stage .network-node').forEach((node, index) => {
    const plant = fixture?.plants?.[index];
    node.hidden = !plant;
    if (!plant) return;
    const shortageAtPlant = (fixture.shortages || []).find((shortage) => shortage.plantId === plant.id);
    node.querySelector('strong')?.replaceChildren(document.createTextNode(plant.name));
    node.querySelector('small')?.replaceChildren(document.createTextNode(plant.lines?.[0]?.name || 'Production plant'));
    node.querySelector('b')?.replaceChildren(document.createTextNode(shortageAtPlant ? 'At risk' : '100%'));
    node.querySelector('.plant-glyph')?.replaceChildren(document.createTextNode(plant.name.charAt(0) || 'P'));
  });
}

function updateFixtureRecommendations(fixture) {
  const shortage = fixture?.shortages?.[0];
  const part = fixture?.parts?.find((entry) => entry.id === shortage?.partId);
  const plant = fixture?.plants?.find((entry) => entry.id === shortage?.plantId);
  const purchaseOrder = fixture?.purchaseOrders?.find((entry) => entry.partId === shortage?.partId);
  const supplier = fixture?.suppliers?.find((entry) => entry.id === purchaseOrder?.supplierId);
  const plannerAction = fixture?.plannerActions?.find((entry) => entry.shortageId === shortage?.id) || fixture?.plannerActions?.[0];
  const actionPanel = document.querySelector('.action-panel');
  if (shortage && actionPanel) {
    const heading = actionPanel.querySelector('h2');
    const copy = actionPanel.querySelector('.recommendation-body p');
    const impactValues = actionPanel.querySelectorAll('.recommendation-impact b');
    if (heading) heading.textContent = `Protect ${plant?.name || 'the active plant'}`;
    setInlineCopy(copy, 'Expedite ', purchaseOrder?.id || 'the active PO', ` by air from ${supplier?.name || 'the supplier'}. Protects ${part?.name || 'the constrained material'} coverage before the ${shortage.daysOfSupply}-day breach.`);
    if (impactValues[0] && Number.isFinite(Number(plannerAction?.costDelta))) impactValues[0].textContent = `+$${Number(plannerAction.costDelta).toLocaleString('en-US')}`;
    if (impactValues[1]) impactValues[1].textContent = `${shortage.affectedHours} hrs`;
    if (impactValues[2]) impactValues[2].textContent = `Breach in ${shortage.daysOfSupply} days`;
  }
  const queueItems = document.querySelectorAll('.queue-list .queue-item');
  if (shortage && queueItems[0]) {
    const item = queueItems[0];
    item.querySelector('strong')?.replaceChildren(document.createTextNode(`${part?.name || shortage.partId} shortage`));
    const copy = item.querySelector('p');
    setInlineCopy(copy, `May stop ${plant?.name || 'the active plant'} in `, `${shortage.daysOfSupply} days`);
    const meta = item.querySelectorAll('.queue-meta span');
    if (meta[0]) meta[0].textContent = part?.partNumber || shortage.partId;
    if (meta[2]) meta[2].textContent = purchaseOrder?.id || 'Active PO';
  }
  const lateShipment = fixture?.shipments?.find((entry) => entry.status === 'late');
  const lateOrder = fixture?.purchaseOrders?.find((entry) => entry.id === lateShipment?.purchaseOrderId);
  const lateSupplier = fixture?.suppliers?.find((entry) => entry.id === lateOrder?.supplierId);
  if (lateShipment && queueItems[1]) {
    const item = queueItems[1];
    item.querySelector('strong')?.replaceChildren(document.createTextNode(`${lateSupplier?.name || 'Supplier'} shipment late`));
    const copy = item.querySelector('p');
    setInlineCopy(copy, 'ETA moved to ', lateShipment.eta || 'the revised date');
    const meta = item.querySelectorAll('.queue-meta span');
    if (meta[0]) meta[0].textContent = lateOrder?.id || lateShipment.purchaseOrderId;
    if (meta[2]) meta[2].textContent = lateShipment.mode || 'Inbound';
  }
}

const fixtures = {
  shortage: { kicker: 'CRITICAL MATERIAL', title: 'Inverter housing shortage', intro: 'A constrained component is projected to interrupt production at Northstar Austin.', material: 'MAT-2048 · Inverter housing', cover: '1.8 days cover', floor: '2.0 days', progress: '28%', plant: 'Austin · Assembly line 2', line: 'EV platform / 240 units per shift', hours: '18.4 hrs', action: 'Expedite PO-8421', actionCopy: 'Air freight 480 housings from Apex Metals. Keeps coverage above safety floor.', trace: '<div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Apex Metals confirmed</strong><small>PO-8421 · 1,200 housings</small></div><time>Sep 12</time></div><div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Shipment in transit</strong><small>SHP-8421 · truck · ETA Sep 18</small></div><time>Sep 15</time></div><div class="trace-item alert"><span class="trace-dot">!</span><div><strong>Safety floor breach projected</strong><small>MAT-2048 · Austin line 2</small></div><time>Today</time></div><div class="trace-item proposed"><span class="trace-dot">↯</span><div><strong>Expedite available</strong><small>Air freight · +$4,280 estimate</small></div><time>Next</time></div>' },
  late: { kicker: 'SHIPMENT AT RISK', title: 'Nordic Circuits shipment late', intro: 'A late inbound is compressing cover for the vehicle control unit build plan.', material: 'VCU-1190 · Vehicle control unit', cover: '4.4 days cover', floor: '5.0 days', progress: '64%', plant: 'Austin · Assembly line 1', line: 'Vehicle controls / 180 units per shift', hours: '6.0 hrs', action: 'Confirm revised ETA', actionCopy: 'Ask Nordic Circuits to confirm the Sep 19 ETA and reserve an alternate air lane.', trace: '<div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Nordic Circuits confirmed</strong><small>PO-8398 · 600 control units</small></div><time>Sep 10</time></div><div class="trace-item alert"><span class="trace-dot">!</span><div><strong>ETA slipped by 2 days</strong><small>SHP-8398 · air · now Sep 19</small></div><time>Today</time></div><div class="trace-item alert"><span class="trace-dot">!</span><div><strong>Cover approaching floor</strong><small>VCU-1190 · Austin line 1</small></div><time>+2 days</time></div><div class="trace-item proposed"><span class="trace-dot">↗</span><div><strong>Supplier confirmation needed</strong><small>Protect the alternate lane before breach</small></div><time>Next</time></div>' }
};

fixtures.healthy = { kicker: 'HEALTHY FLOW', title: 'Vektor Plastics on schedule', intro: 'The cooling-manifold lane is healthy and does not currently constrain production.', material: 'PLS-7782 · Cooling manifold', cover: '12.4 days cover', floor: '7.0 days', progress: '88%', plant: 'Reno · Power systems', line: 'Power systems / 180 units per shift', hours: '0 hrs', action: 'No action required', actionCopy: 'Supplier reliability is 94% and the next inbound remains inside the committed window.', trace: '<div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Vektor Plastics confirmed</strong><small>PO-8410 · 900 manifolds</small></div><time>Sep 13</time></div><div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Shipment on schedule</strong><small>SHP-8410 · truck · ETA Sep 20</small></div><time>Sep 15</time></div><div class="trace-item complete"><span class="trace-dot">✓</span><div><strong>Safety floor protected</strong><small>PLS-7782 · Reno power systems</small></div><time>Today</time></div>' };

function showDrawer(type = 'shortage') {
  let item = fixtures[type] || fixtures.shortage;
  const shortage = activeFixture?.shortages?.[0];
  if (type === 'shortage' && shortage) {
    const part = activeFixture.parts?.find((entry) => entry.id === shortage.partId);
    const plant = activeFixture.plants?.find((entry) => entry.id === shortage.plantId);
    const plannerAction = activeFixture.plannerActions?.find((entry) => entry.shortageId === shortage.id) || activeFixture.plannerActions?.[0];
    const purchaseOrder = activeFixture.purchaseOrders?.find((entry) => entry.partId === shortage.partId);
    const supplier = activeFixture.suppliers?.find((entry) => entry.id === purchaseOrder?.supplierId);
    item = {
      ...item,
      title: `${part?.name || shortage.partId} shortage`,
      intro: `A constrained component is projected to interrupt production at ${plant?.name || 'the active plant'}.`,
      material: `${part?.partNumber || shortage.partId} · ${part?.name || 'Constrained material'}`,
      cover: `${shortage.daysOfSupply} days cover`,
      plant: plant?.name || item.plant,
      hours: `${shortage.affectedHours} hrs`,
      action: purchaseOrder ? `Expedite ${purchaseOrder.id}` : item.action,
      actionCopy: supplier ? `Expedite ${purchaseOrder.quantity?.toLocaleString?.('en-US') || purchaseOrder.quantity} units from ${supplier.name}. Keeps coverage above safety floor.` : item.actionCopy
    };
    if (plannerAction?.costDelta) item.actionCopy += ` Estimated cost delta: +$${Number(plannerAction.costDelta).toLocaleString('en-US')}.`;
  }
  if (type === 'late' && activeFixture?.shipments?.length) {
    const shipment = activeFixture.shipments.find((entry) => entry.status === 'late') || activeFixture.shipments[0];
    const purchaseOrder = activeFixture.purchaseOrders?.find((entry) => entry.id === shipment.purchaseOrderId);
    const supplier = activeFixture.suppliers?.find((entry) => entry.id === purchaseOrder?.supplierId);
    const part = activeFixture.parts?.find((entry) => entry.id === purchaseOrder?.partId);
    const relatedShortage = activeFixture.shortages?.find((entry) => entry.partId === purchaseOrder?.partId);
    const plant = activeFixture.plants?.find((entry) => entry.id === relatedShortage?.plantId);
    const eta = shipment.eta ? new Date(shipment.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'the revised date';
    item = {
      ...item,
      title: `${supplier?.name || 'Supplier'} shipment late`,
      intro: `A late inbound is compressing cover for the ${part?.name || purchaseOrder?.partId || 'active material'} build plan.`,
      material: `${part?.partNumber || purchaseOrder?.partId || item.material.split(' · ')[0]} · ${part?.name || 'Vehicle control unit'}`,
      cover: relatedShortage ? `${relatedShortage.daysOfSupply} days cover` : item.cover,
      plant: plant?.name || item.plant,
      hours: relatedShortage ? `${relatedShortage.affectedHours} hrs` : item.hours,
      actionCopy: `${supplier?.name || 'Supplier'} should confirm the ${eta} ETA and reserve an alternate lane.`
    };
  }
  if (type === 'healthy' && activeFixture?.suppliers?.length) {
    const supplier = activeFixture.suppliers.find((entry) => entry.status === 'healthy') || activeFixture.suppliers[0];
    const purchaseOrder = activeFixture.purchaseOrders?.find((entry) => entry.supplierId === supplier.id);
    const part = activeFixture.parts?.find((entry) => entry.id === purchaseOrder?.partId);
    const shipment = activeFixture.shipments?.find((entry) => entry.purchaseOrderId === purchaseOrder?.id);
    const plant = activeFixture.plants?.[0];
    const eta = shipment?.eta ? new Date(shipment.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'the committed window';
    item = {
      ...item,
      title: `${supplier.name} on schedule`,
      intro: `The ${part?.name || 'active component'} lane is healthy and does not currently constrain production.`,
      material: `${part?.partNumber || 'Active material'} · ${part?.name || 'Healthy component'}`,
      plant: plant?.name || item.plant,
      actionCopy: `${supplier.name} reliability is ${supplier.reliabilityScore ?? 'strong'}% and the next inbound remains inside the committed window through ${eta}.`
    };
  }
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
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show'); focusOverlay(drawer);
}
function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); restoreFocus(); }
function showToast(message) { toastCopy.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3500); }
const syncStatus = document.getElementById('sync-status');
const syncPopover = document.getElementById('sync-popover');
syncStatus.setAttribute('aria-haspopup', 'dialog');
syncStatus.setAttribute('aria-expanded', 'false');
function toggleSyncPopover() { const open = syncPopover.classList.toggle('open'); syncPopover.setAttribute('aria-hidden', String(!open)); syncStatus.setAttribute('aria-expanded', String(open)); }
syncStatus.addEventListener('click', toggleSyncPopover);
document.addEventListener('click', (event) => { if (!syncPopover.contains(event.target) && !syncStatus.contains(event.target)) { syncPopover.classList.remove('open'); syncPopover.setAttribute('aria-hidden', 'true'); syncStatus.setAttribute('aria-expanded', 'false'); } });
const scenarioModal = document.getElementById('scenario-modal');
const scenarioBackdrop = document.getElementById('scenario-backdrop');
let scenarioReady = false;
scenarioModal.setAttribute('aria-modal', 'true');

function getScenarioImpact() {
  const shortage = activeFixture?.shortages?.[0];
  const plannerAction = activeFixture?.plannerActions?.[0];
  const currentCover = Number(shortage?.daysOfSupply);
  const protectedHours = Number(plannerAction?.impactHours ?? shortage?.affectedHours);
  const costDelta = Number(plannerAction?.costDelta);
  const projectedCover = Number.isFinite(currentCover) ? Number((currentCover + 2).toFixed(1)) : 3.8;
  return {
    projectedCover,
    coverDelta: Number.isFinite(currentCover) ? Number((projectedCover - currentCover).toFixed(1)) : 2,
    protectedHours: Number.isFinite(protectedHours) ? protectedHours : 18.4,
    costDelta: Number.isFinite(costDelta) ? costDelta : 4280
  };
}

function updateScenarioPreview() {
  const impact = getScenarioImpact();
  const values = document.querySelectorAll('.scenario-result strong');
  const deltas = document.querySelectorAll('.scenario-result .positive');
  if (values[0]) values[0].textContent = `${impact.projectedCover} days`;
  if (values[1]) values[1].textContent = `${impact.protectedHours} hrs`;
  if (values[2]) values[2].textContent = `+$${impact.costDelta.toLocaleString('en-US')}`;
  if (deltas[0]) deltas[0].textContent = `+${impact.coverDelta} days`;
  if (deltas[1]) deltas[1].textContent = 'Recovered';
}

function openScenario() {
  scenarioReady = false;
  updateScenarioPreview();
  document.querySelector('.scenario-modal-intro').textContent = 'Compare one planner move against the current baseline before committing it.';
  document.getElementById('scenario-run').innerHTML = 'Run preview <span>→</span>';
  scenarioModal.classList.add('open'); scenarioModal.setAttribute('aria-hidden', 'false'); scenarioBackdrop.classList.add('show'); focusOverlay(scenarioModal);
}
function closeScenario() { scenarioModal.classList.remove('open'); scenarioModal.setAttribute('aria-hidden', 'true'); scenarioBackdrop.classList.remove('show'); restoreFocus(); }
function runScenario() {
  if (!scenarioReady) {
    scenarioReady = true;
    const impact = getScenarioImpact();
    document.querySelector('.scenario-modal-intro').textContent = 'Preview complete. Review the impact, then queue this plan for planner review.';
    document.getElementById('scenario-run').innerHTML = 'Queue plan <span>✓</span>';
    showToast(`Preview complete: ${impact.projectedCover} days cover and ${impact.protectedHours} hours protected.`);
    return;
  }
  scenarioReady = false;
  sessionStorage.setItem('chainos-scenario-status', 'queued');
  document.dispatchEvent(new CustomEvent('chainos:activity', { detail: { label: 'Scenario plan · Expedite PO-8421' } }));
  closeScenario();
  showToast('Scenario plan queued for planner review.');
}

async function loadFixture({ ignoreSessionImport = false } = {}) {
  const syncLabel = document.getElementById('sync-label');
  syncLabel.textContent = 'Loading fixture…';
  const persistedImport = sessionStorage.getItem('chainos-imported-fixture');
  if (persistedImport && !ignoreSessionImport) {
    try {
      document.dispatchEvent(new CustomEvent('chainos:fixture-import', { detail: { fixture: JSON.parse(persistedImport), fileName: 'session snapshot' } }));
      window.chainosFixtureSource = 'session import';
      return;
    } catch (error) {
      sessionStorage.removeItem('chainos-imported-fixture');
    }
  }
  try {
    const configuredApiUrl = window.CHAINOS_API_URL || document.querySelector('meta[name="chainos-api-url"]')?.content?.trim() || localStorage.getItem('chainos-api-url') || '';
    const apiFixtureUrl = configuredApiUrl ? `${configuredApiUrl.replace(/\/$/, '')}/api/fixture` : '';
    const fixtureSources = apiFixtureUrl ? [{ url: apiFixtureUrl, label: 'ChainOS API' }, { url: 'data/fixture.json', label: 'fixture.json' }] : [{ url: 'data/fixture.json', label: 'fixture.json' }];
    let response;
    let sourceLabel = 'fixture.json';
    let lastError;
    for (const source of fixtureSources) {
      try {
        const candidate = await fetch(source.url);
        if (!candidate.ok) throw new Error(`${source.url} returned ${candidate.status}`);
        response = candidate;
        sourceLabel = source.label;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!response) throw lastError || new Error('No fixture source available');
    activeFixture = await response.json();
    window.chainosFixture = activeFixture;
    window.chainosFixtureSource = sourceLabel;
    document.dispatchEvent(new CustomEvent('chainos:fixture-ready', { detail: { fixture: activeFixture } }));
    updateFixtureContext(activeFixture);
    updateFixtureHealth(activeFixture);
    updateFixtureRecommendations(activeFixture);
    syncLabel.textContent = sourceLabel === 'ChainOS API' ? 'API synced' : 'Synced 2 min ago';
    syncStatus.classList.remove('fallback');
    document.querySelector('.sync-popover-foot').textContent = `Source: ${sourceLabel}`;
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
    if (footer && activeFixture.workspace) footer.textContent = `ChainOS ${sourceLabel === 'ChainOS API' ? 'Phase 2' : 'Phase 1'} · ${activeFixture.workspace} ${sourceLabel === 'ChainOS API' ? 'API' : 'fixture'}`;
    const activeView = document.querySelector('.nav-item.active')?.dataset.view;
    if (activeView && activeView !== 'overview') { renderView(activeView); refreshMaterialTable(activeView, activeFixture); refreshSecondaryInsights(activeView, activeFixture); refreshConstraintTable(activeView, activeFixture); refreshScenarioWorkspace(activeView, activeFixture); updateViewHeader(activeView, activeFixture); }
  } catch (error) {
    // The page remains usable when opened directly from disk; the visible defaults are the same fixture values.
    syncLabel.textContent = 'Demo fixture inline';
    syncStatus.classList.add('fallback');
    window.chainosFixtureSource = 'inline fallback';
    console.info('Using inline fixture defaults.', error.message);
  }
}
window.chainosReloadFixture = () => loadFixture({ ignoreSessionImport: true });

document.addEventListener('chainos:fixture-import', (event) => {
  const fixture = event.detail?.fixture;
  if (!fixture) return;
  activeFixture = fixture;
  window.chainosFixture = fixture;
  sessionStorage.setItem('chainos-imported-fixture', JSON.stringify(fixture));
  updateFixtureContext(fixture, event.detail.fileName || 'imported snapshot');
  updateFixtureHealth(fixture);
  updateFixtureRecommendations(fixture);
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
  if (activeView && activeView !== 'overview') { renderView(activeView); refreshMaterialTable(activeView, fixture); refreshSecondaryInsights(activeView, fixture); refreshConstraintTable(activeView, fixture); refreshScenarioWorkspace(activeView, fixture); updateViewHeader(activeView, fixture); }
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
    const shortageCount = activeFixture?.shortages?.length ?? 3;
    document.getElementById('risk-count').textContent = String(shortageCount).padStart(2, '0');
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
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const overlay = drawer.classList.contains('open') ? drawer : scenarioModal.classList.contains('open') ? scenarioModal : null;
  if (!overlay) return;
  const elements = focusableElements(overlay);
  if (!elements.length) return;
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
document.querySelector('.icon-button:not(#notification-button)')?.addEventListener('click', () => showDrawer('shortage'));
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

function updateViewHeader(view, fixture) {
  const base = viewCopy[view] || viewCopy.overview;
  const counts = {
    parts: fixture?.parts?.length || 0,
    suppliers: fixture?.suppliers?.length || 0,
    purchaseOrders: fixture?.purchaseOrders?.length || 0,
    shipments: fixture?.shipments?.length || 0,
    inventory: fixture?.inventoryPositions?.length || 0,
    constraints: fixture?.constraints?.length || 0
  };
  const subtitles = {
    materials: `${counts.parts} components are shaping this planning outlook.`,
    suppliers: `${counts.suppliers} suppliers are contributing commitments to the network.`,
    'purchase-orders': `${counts.purchaseOrders} open commitments are in the active snapshot.`,
    logistics: `${counts.shipments} inbound lanes are represented in this snapshot.`,
    inventory: `${counts.inventory} inventory position${counts.inventory === 1 ? '' : 's'} are available for review.`,
    constraints: `${counts.constraints} constraint${counts.constraints === 1 ? '' : 's'} are represented in the active plan.`
  };
  document.getElementById('page-title').textContent = base[0];
  document.getElementById('page-subtitle').textContent = subtitles[view] || base[1];
}

function refreshMaterialTable(view, fixture) {
  if (!['materials', 'inventory'].includes(view) || !fixture?.parts?.length) return;
  const body = document.querySelector('#secondary-view .data-table tbody');
  if (!body) return;
  const rows = fixture.parts.map((part) => {
    const shortage = fixture.shortages?.find((entry) => entry.partId === part.id);
    const inventory = fixture.inventoryPositions?.find((entry) => entry.partId === part.id);
    const plant = fixture.plants?.find((entry) => entry.id === inventory?.plantId) || fixture.plants?.find((entry) => entry.id === shortage?.plantId);
    const row = document.createElement('tr');
    const material = document.createElement('td');
    material.className = 'table-primary';
    material.textContent = `${part.partNumber || part.id} · ${part.name || 'Unnamed part'}`;
    const plantCell = document.createElement('td');
    plantCell.textContent = plant?.name || '—';
    const cover = document.createElement('td');
    cover.className = shortage ? 'critical-text' : '';
    cover.textContent = shortage ? `${shortage.daysOfSupply} days` : '—';
    const floor = document.createElement('td');
    floor.textContent = inventory?.safetyStock != null ? `${inventory.safetyStock.toLocaleString?.('en-US') || inventory.safetyStock} ea` : '—';
    const signal = document.createElement('td');
    const status = document.createElement('span');
    status.className = `table-status ${shortage?.severity === 'critical' ? 'critical' : shortage ? 'watch' : 'good'}`;
    status.textContent = shortage ? (shortage.severity === 'critical' ? 'Critical' : 'Watch') : 'Healthy';
    signal.appendChild(status);
    row.append(material, plantCell, cover, floor, signal);
    return row;
  });
  body.replaceChildren(...rows);
}

function refreshSecondaryInsights(view, fixture) {
  const host = document.getElementById('secondary-view');
  if (!host || !fixture) return;
  if (view === 'suppliers') {
    const supplier = fixture.suppliers?.find((entry) => entry.status !== 'healthy') || fixture.suppliers?.[0];
    const purchaseOrder = fixture.purchaseOrders?.find((entry) => entry.supplierId === supplier?.id);
    const shipment = fixture.shipments?.find((entry) => entry.purchaseOrderId === purchaseOrder?.id);
    const heading = host.querySelector('.insight-panel h2');
    const calloutTitle = host.querySelector('.view-callout strong');
    const calloutCopy = host.querySelector('.view-callout p');
    if (heading && supplier) heading.textContent = `${supplier.name} needs a plan`;
    if (calloutTitle && supplier) calloutTitle.textContent = `${supplier.name} · ${supplier.reliabilityScore ?? '—'}% reliability`;
    if (calloutCopy && purchaseOrder) calloutCopy.textContent = `${purchaseOrder.id} is ${shipment?.status === 'late' ? `late with ETA ${shipment.eta || 'pending'}` : `due ${purchaseOrder.dueDate}`}. Review the inbound before the next planning run.`;
  }
  if (view === 'purchase-orders' || view === 'logistics') {
    const cards = host.querySelectorAll('.mini-insight');
    (fixture.purchaseOrders || []).slice(0, 2).forEach((purchaseOrder, index) => {
      const card = cards[index];
      if (!card) return;
      const supplier = fixture.suppliers?.find((entry) => entry.id === purchaseOrder.supplierId);
      const shipment = fixture.shipments?.find((entry) => entry.purchaseOrderId === purchaseOrder.id);
      card.hidden = false;
      card.querySelector('.mini-insight-top strong')?.replaceChildren(document.createTextNode(`${purchaseOrder.id} · ${supplier?.name || 'Supplier'}`));
      const status = card.querySelector('.mini-insight-top span');
      if (status) {
        status.textContent = shipment?.status === 'late' ? 'Late' : shipment?.status === 'in-transit' ? 'In transit' : purchaseOrder.status || 'Open';
        status.className = shipment?.status === 'late' ? 'critical-text' : '';
      }
      card.querySelector('p')?.replaceChildren(document.createTextNode(shipment?.status === 'late' ? `ETA moved to ${shipment.eta || 'the revised date'}. Review the inbound before the next planning run.` : `${purchaseOrder.quantity?.toLocaleString?.('en-US') || purchaseOrder.quantity} units due ${purchaseOrder.dueDate}.`));
    });
    for (let index = (fixture.purchaseOrders || []).slice(0, 2).length; index < cards.length; index += 1) cards[index].hidden = true;
  }
}

function refreshConstraintTable(view, fixture) {
  if (view !== 'constraints' || !Array.isArray(fixture?.constraints)) return;
  const body = document.querySelector('#secondary-view .data-table tbody');
  if (!body) return;
  const constraints = fixture.constraints;
  const activeCount = constraints.filter((constraint) => Number(constraint.consumed) >= Number(constraint.capacity)).length;
  const rows = constraints.map((constraint) => {
    const breached = Number(constraint.consumed) >= Number(constraint.capacity);
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.className = 'table-primary';
    name.textContent = constraint.type ? `${constraint.type} availability` : constraint.id || 'Constraint';
    const scope = document.createElement('td');
    scope.textContent = constraint.scope || '—';
    const consumed = document.createElement('td');
    consumed.textContent = `${constraint.consumed ?? '—'} / ${constraint.capacity ?? '—'}`;
    const window = document.createElement('td');
    window.textContent = constraint.window || '—';
    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    status.className = `table-status ${breached ? 'critical' : 'good'}`;
    status.textContent = breached ? 'Breaches floor' : 'Healthy';
    statusCell.appendChild(status);
    row.append(name, scope, consumed, window, statusCell);
    return row;
  });
  body.replaceChildren(...rows);
  const activeLabel = document.querySelector('#secondary-view .table-panel .view-header .table-status');
  if (activeLabel) {
    activeLabel.textContent = `${activeCount} active`;
    activeLabel.className = `table-status ${activeCount ? 'critical' : 'good'}`;
  }
}

function refreshScenarioWorkspace(view, fixture) {
  if (view !== 'scenarios' || !fixture) return;
  const host = document.getElementById('secondary-view');
  const shortage = fixture.shortages?.[0];
  const part = fixture.parts?.find((entry) => entry.id === shortage?.partId);
  const plant = fixture.plants?.find((entry) => entry.id === shortage?.plantId);
  const impact = getScenarioImpact();
  const cardTitle = host.querySelector('.scenario-card h2');
  const cardCopy = host.querySelector('.scenario-card p');
  const startButton = host.querySelector('#scenario-start');
  if (cardTitle) cardTitle.textContent = `Test a move for ${part?.partNumber || shortage?.partId || 'the active exception'}.`;
  if (cardCopy) cardCopy.textContent = `Compare service, cost, and coverage impacts for ${plant?.name || 'the active plant'} before committing a planner move.`;
  if (startButton?.firstChild) startButton.firstChild.textContent = `Start with ${part?.partNumber || shortage?.partId || 'active exception'} `;
  const insightCards = host.querySelectorAll('.mini-insight');
  if (insightCards[0]) {
    insightCards[0].querySelector('.mini-insight-top span')?.replaceChildren(document.createTextNode(`+${impact.protectedHours} hrs`));
    insightCards[0].querySelector('p')?.replaceChildren(document.createTextNode(`The proposed move keeps ${plant?.name || 'the active plant'} above its safety floor.`));
  }
  if (insightCards[1]) {
    insightCards[1].querySelector('.mini-insight-top span')?.replaceChildren(document.createTextNode(`+$${impact.costDelta.toLocaleString('en-US')}`));
    insightCards[1].querySelector('p')?.replaceChildren(document.createTextNode('Estimate is based on the active fixture planner action.'));
  }
}

function renderView(view) {
  const host = document.getElementById('secondary-view');
  if (view === 'overview') { host.classList.add('hidden'); host.innerHTML = ''; return; }
  host.classList.remove('hidden');
  const f = activeFixture || { suppliers: [], purchaseOrders: [], shortages: [] };
  const shortage = f.shortages[0] || { daysOfSupply: 1.8, affectedHours: 18.4 };
  if (view === 'materials' || view === 'inventory') {
    host.innerHTML = `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">${view === 'materials' ? 'MATERIALS WATCHLIST' : 'INVENTORY POSITION'}</div><h2>${view === 'materials' ? 'Components shaping the plan' : 'Coverage by critical component'}</h2></div><div class="panel-filter">Week 38 <span>⌄</span></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Material</th><th>Plant</th><th>Cover</th><th>Safety floor</th><th>Signal</th></tr></thead><tbody><tr><td class="table-primary">MAT-2048 · Inverter housing</td><td>Austin L2</td><td class="critical-text">${shortage.daysOfSupply} days</td><td>2.0 days</td><td><span class="table-status critical">Critical</span></td></tr><tr><td class="table-primary">VCU-1190 · Vehicle control unit</td><td>Austin L1</td><td>8.7 days</td><td>5.0 days</td><td><span class="table-status good">Healthy</span></td></tr><tr><td class="table-primary">PLS-7782 · Cooling manifold</td><td>Reno P1</td><td>12.4 days</td><td>7.0 days</td><td><span class="table-status good">Healthy</span></td></tr></tbody></table></div></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">EXCEPTION LOGIC</div><h2>Why MAT-2048 is flagged</h2></div></div><div class="mini-insight"><div class="mini-insight-top"><strong>Projected breach</strong><span>${shortage.daysOfSupply} days</span></div><p>Usable on-hand falls below the 2-day safety floor before PO-8421 arrives on Sep 18.</p><div class="metric-line amber"><span style="width:28%"></span></div></div><div class="mini-insight"><div class="mini-insight-top"><strong>Production exposure</strong><span>${shortage.affectedHours} hrs</span></div><p>Austin assembly line 2 consumes 240 housings per shift against the current allocation.</p></div><div class="view-callout"><div class="view-callout-icon">↯</div><div><strong>Planner move available</strong><p>Expedite the existing PO instead of creating a new source.</p></div></div></article>`;
  } else if (view === 'suppliers') {
    const rows = f.suppliers.map((s) => `<tr><td class="table-primary">${escapeHtml(s.name)}</td><td>${escapeHtml(s.region)}</td><td>${escapeHtml(s.reliabilityScore)}%</td><td><span class="table-status ${s.status === 'watch' ? 'watch' : 'good'}">${s.status === 'watch' ? 'Watch' : 'Healthy'}</span></td><td>${s.status === 'watch' ? '1 late shipment' : 'On schedule'}</td></tr>`).join('');
    host.innerHTML = `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">SUPPLIER PERFORMANCE</div><h2>Reliability and commitments</h2></div><button class="text-button">Export view <span>↓</span></button></div><table class="data-table"><thead><tr><th>Supplier</th><th>Region</th><th>Reliability</th><th>Status</th><th>Current signal</th></tr></thead><tbody>${rows}</tbody></table></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">NETWORK NOTE</div><h2>One supplier needs a plan</h2></div></div><div class="view-callout"><div class="view-callout-icon">!</div><div><strong>Nordic Circuits · 71% reliability</strong><p>PO-8398 moved from Sep 17 to Sep 19. Review the inbound before the next planning run.</p></div></div></article>`;
  } else if (view === 'purchase-orders' || view === 'logistics') {
    const rows = f.purchaseOrders.map((po) => `<tr><td class="table-id">${escapeHtml(po.id)}</td><td class="table-primary">${escapeHtml(po.partId.replace('PART-', ''))}</td><td>${escapeHtml(po.quantity?.toLocaleString?.('en-US') || po.quantity)} ea</td><td>${escapeHtml(po.dueDate)}</td><td><span class="table-status ${po.status === 'at-risk' ? 'critical' : 'open'}">${po.status === 'at-risk' ? 'At risk' : 'Open'}</span></td></tr>`).join('');
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
  updateViewHeader(item.dataset.view, activeFixture);
  document.querySelector('.page-content').classList.toggle('view-mode', item.dataset.view !== 'overview');
  renderView(item.dataset.view);
  refreshMaterialTable(item.dataset.view, activeFixture);
  refreshSecondaryInsights(item.dataset.view, activeFixture);
  refreshConstraintTable(item.dataset.view, activeFixture);
  refreshScenarioWorkspace(item.dataset.view, activeFixture);
  if (item.dataset.view !== 'overview') showToast(`${copy[0]} view selected.`);
}));

loadFixture();
if (sessionStorage.getItem('chainos-action-status') === 'queued') markActionQueued();
if (sessionStorage.getItem('chainos-action-status') === 'approved') { markActionQueued(); document.getElementById('accept-action').innerHTML = 'Expedite approved <span>✓</span>'; }
