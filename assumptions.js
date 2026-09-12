(function () {
  document.body.insertAdjacentHTML('beforeend', '<div class="assumptions-backdrop" id="assumptions-backdrop"></div><section class="assumptions-modal" id="assumptions-modal" aria-hidden="true" role="dialog" aria-labelledby="assumptions-title"><button class="assumptions-close" id="assumptions-close" aria-label="Close assumptions">×</button><div class="drawer-kicker">SCENARIO ASSUMPTIONS</div><h2 id="assumptions-title">Transparent by design.</h2><p class="assumptions-intro">This Phase 1 preview uses a small, fixture-backed heuristic to make one planner move legible.</p><div class="assumption-list"><div><strong>Demand signal</strong><span>Current fixture demand rate for Austin line 2.</span></div><div><strong>Inventory position</strong><span>Usable on-hand compared with the 2-day safety floor.</span></div><div><strong>Inbound timing</strong><span>Committed PO-8421 ETA compared with the projected breach.</span></div><div><strong>Cost estimate</strong><span>Illustrative truck-to-air delta of $4,280.</span></div></div><div class="assumptions-excluded"><strong>Not modeled in Phase 1</strong><p>Supplier capacity reservation, alternate sourcing, multi-echelon balancing, and external request submission.</p></div></section>');
  const modal = document.getElementById('assumptions-modal');
  const backdrop = document.getElementById('assumptions-backdrop');
  const closeButton = document.getElementById('assumptions-close');
  function close() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('show'); }
  function open() { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); backdrop.classList.add('show'); }
  document.addEventListener('click', (event) => {
    if (event.target.closest('.scenario-card .secondary-button')) open();
  });
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}());
