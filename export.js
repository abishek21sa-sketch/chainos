(function () {
  function csvValue(value) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  function exportCurrentTable(button) {
    const table = button.closest('.secondary-view')?.querySelector('.data-table');
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr:not(.table-filter-empty)')).filter((row) => !row.hidden).map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((cell) => csvValue(cell.textContent.trim())).join(','));
    const blob = new Blob([`${rows.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
    const download = document.createElement('a');
    download.href = URL.createObjectURL(blob);
    const view = document.querySelector('.nav-item.active')?.dataset.view || 'view';
    download.download = `chainos-${view}-export.csv`;
    document.body.appendChild(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(download.href), 0);
    showToast(`Exported ${Math.max(rows.length - 1, 0)} visible row${rows.length === 2 ? '' : 's'} as CSV.`);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.secondary-view .text-button');
    if (button && button.textContent.includes('Export view')) exportCurrentTable(button);
  });
}());
