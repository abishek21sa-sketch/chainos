(function () {
  const host = document.getElementById('secondary-view');
  if (!host) return;
  let fixture = null;
  try { fixture = JSON.parse(sessionStorage.getItem('chainos-imported-fixture') || 'null'); } catch (error) { sessionStorage.removeItem('chainos-imported-fixture'); }
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  function active() { return document.querySelector('.nav-item.active')?.dataset.view === 'constraints'; }
  function render(data) {
    if (!active() || !data) return;
    const parts = new Map((data.parts || []).map((part) => [part.id, part]));
    const plants = new Map((data.plants || []).map((plant) => [plant.id, plant]));
    const shortages = data.shortages || [];
    const exposure = shortages.reduce((total, item) => total + Number(item.affectedHours || 0), 0);
    const rows = shortages.map((item) => {
      const part = parts.get(item.partId) || { partNumber: item.partId, name: 'Unknown material' };
      const plant = plants.get(item.plantId) || { name: item.plantId };
      const severity = item.severity || 'watch';
      return `<tr class="triage-row" tabindex="0" data-triage-shortage="${escapeHTML(item.id)}"><td class="table-primary">${escapeHTML(part.partNumber)} · ${escapeHTML(part.name)}</td><td>${escapeHTML(plant.name)}</td><td class="critical-text">${escapeHTML(item.daysOfSupply)} days</td><td>${escapeHTML(item.affectedHours)} hrs</td><td><span class="table-status ${severity === 'critical' ? 'critical' : 'watch'}">${escapeHTML(severity === 'critical' ? 'Critical' : 'Watch')}</span></td></tr>`;
    }).join('');
    host.dataset.triageEnhanced = 'true';
    host.innerHTML = shortages.length ? `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">SHORTAGE TRIAGE</div><h2>All material exceptions</h2></div><span class="table-status critical">${shortages.length} active</span></div><div class="triage-summary"><div class="triage-summary-card"><small>Active shortages</small><strong class="critical-text">${shortages.length}</strong></div><div class="triage-summary-card"><small>Production exposure</small><strong>${exposure.toFixed(1)} hrs</strong></div><div class="triage-summary-card"><small>Next breach</small><strong>${escapeHTML(shortages[0].daysOfSupply)} days</strong></div></div><table class="data-table"><thead><tr><th>Material</th><th>Plant</th><th>Cover</th><th>Exposure</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></article><article class="panel insight-panel"><div class="view-header"><div><div class="view-kicker">TRIAGE GUIDANCE</div><h2>Prioritize by production impact</h2></div></div><div class="view-callout"><div class="view-callout-icon">!</div><div><strong>Start with the earliest breach</strong><p>Open any row to inspect its material signal, assign an owner, add a note, and queue the proposed planner move.</p></div></div></article>` : `<article class="panel table-panel"><div class="view-header"><div><div class="view-kicker">SHORTAGE TRIAGE</div><h2>No active material exceptions</h2></div></div><div class="triage-empty"><strong>Network is clear</strong><span>Imported data contains no active shortages in this planning window.</span></div></article>`;
    host.querySelectorAll('[data-triage-shortage]').forEach((row) => {
      row.addEventListener('click', () => window.showDrawer?.('shortage'));
      row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.showDrawer?.('shortage'); } });
    });
  }
  async function load() {
    if (fixture) { render(fixture); return; }
    try { fixture = await (await fetch('data/fixture.json')).json(); render(fixture); } catch (error) { console.info('Triage view using inline data.', error.message); }
  }
  document.addEventListener('chainos:fixture-import', (event) => { fixture = event.detail?.fixture || fixture; render(fixture); });
  new MutationObserver(() => { if (active() && host.dataset.triageEnhanced !== 'true') render(fixture); if (!active()) delete host.dataset.triageEnhanced; }).observe(host, { childList: true, subtree: true });
  document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => window.setTimeout(() => { if (item.dataset.view === 'constraints') render(fixture); }, 0)));
  load();
}());
