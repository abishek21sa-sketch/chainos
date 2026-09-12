(function () {
  const drawer = document.getElementById('detail-drawer');
  if (!drawer) return;
  drawer.insertAdjacentHTML('beforeend', '<div class="ownership-block"><div class="ownership-head"><span class="ownership-label">Exception owner</span><span class="activity-status">Local</span></div><select class="ownership-select" id="ownership-select" aria-label="Exception owner"><option>Alex Lee</option><option>Priya Shah</option><option>Mateo Cruz</option></select><p class="ownership-copy">Assign the next review to keep this signal moving through triage.</p></div>');
  const select = document.getElementById('ownership-select');
  function key(type) { return `chainos-owner-${type || 'shortage'}`; }
  function sync(type) { select.value = sessionStorage.getItem(key(type)) || 'Alex Lee'; }
  document.addEventListener('chainos:drawer-open', (event) => sync(event.detail?.type));
  select.addEventListener('change', () => {
    const type = document.getElementById('drawer-title').textContent.includes('late') ? 'late' : 'shortage';
    sessionStorage.setItem(key(type), select.value);
    document.dispatchEvent(new CustomEvent('chainos:activity', { detail: { label: `Owner assigned · ${select.value}` } }));
    showToast(`${select.value} assigned to this exception.`);
  });
  sync('shortage');
}());
