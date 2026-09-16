(function () {
  const host = document.getElementById('secondary-view');
  if (!host) return;
  function sortableValue(text) {
    const value = text.trim().toLowerCase();
    if (/^-?[\d,.]+(?:\s*(?:days?|ea|hrs?|units?))?$/.test(value)) return Number(value.replace(/,/g, '').replace(/\s*(?:days?|ea|hrs?|units?)$/, ''));
    const date = Date.parse(value);
    return Number.isNaN(date) ? value : date;
  }
  function sortTable(table, header) {
    const body = table.querySelector('tbody');
    const rows = Array.from(body.querySelectorAll('tr:not(.table-filter-empty)'));
    const index = header.cellIndex;
    const direction = header.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
    rows.sort((a, b) => {
      const left = sortableValue(a.cells[index]?.textContent || '');
      const right = sortableValue(b.cells[index]?.textContent || '');
      if (left === right) return 0;
      return (left > right ? 1 : -1) * direction;
    });
    body.append(...rows);
    table.querySelectorAll('th.sortable').forEach((cell) => cell.setAttribute('aria-sort', 'none'));
    header.setAttribute('aria-sort', direction === 1 ? 'ascending' : 'descending');
    showToast(`Sorted by ${header.textContent.replace(/[↕↑↓]/g, '').trim()}.`);
  }
  function enhance() {
    host.querySelectorAll('.data-table').forEach((table) => table.querySelectorAll('thead th').forEach((header) => {
      if (header.dataset.sortReady) return;
      header.dataset.sortReady = 'true'; header.classList.add('sortable'); header.tabIndex = 0; header.setAttribute('role', 'button'); header.setAttribute('aria-sort', 'none');
      header.addEventListener('click', () => sortTable(table, header));
      header.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sortTable(table, header); } });
    }));
  }
  new MutationObserver(enhance).observe(host, { childList: true, subtree: true });
  enhance();
}());
