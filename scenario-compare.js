(function () {
  const note = document.querySelector('.scenario-modal-note');
  if (!note) return;
  note.insertAdjacentHTML('beforebegin', '<div class="scenario-compare" aria-label="Baseline and proposed scenario comparison"><div class="scenario-compare-card"><small>Current baseline</small><strong>1.8 days cover</strong><span>18.4 hours of Austin line 2 exposure</span><span class="compare-delta">No incremental cost</span></div><div class="scenario-compare-card proposed"><small>Proposed expedite</small><strong>3.8 days cover</strong><span>Line exposure recovered before the floor breach</span><span class="compare-delta">+$4,280 estimate</span></div></div>');
}());
