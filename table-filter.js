(function () {
  const host = document.getElementById('secondary-view');
  if (!host) return;
  const key = (view) => `chainos-table-filter-${view || 'view'}`;
  const currentView = () => document.querySelector('.nav-item.active')?.dataset.view || 'overview';
  function apply(table, query) {
    const rows = Array.from(table.querySelectorAll('tbody tr:not(.table-filter-empty)'));
    let visible = 0;
    rows.forEach((row) => {
      const match = !query || row.textContent.toLowerCase().includes(query);
      row.hidden = !match;
      if (match) visible += 1;
    });
    table.querySelector('.table-filter-empty')?.remove();
    if (!visible && rows.length) table.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr class="table-filter-empty"><td colspan="99">No matching records.</td></tr>');
  }
  function enhance() {
    const table = host.querySelector('.data-table');
    const header = host.querySelector('.view-header');
    if (!table || !header || header.querySelector('.table-filter-input')) return;
    const input = document.createElement('input');
    input.className = 'table-filter-input'; input.type = 'search'; input.placeholder = 'Filter rows…'; input.setAttribute('aria-label', 'Filter rows');
    input.value = sessionStorage.getItem(key(currentView())) || '';
    header.appendChild(input);
    const update = () => { const query = input.value.trim().toLowerCase(); sessionStorage.setItem(key(currentView()), query); apply(table, query); };
    input.addEventListener('input', update); update();
  }
  new MutationObserver(enhance).observe(host, { childList: true, subtree: true });
  enhance();
}());
