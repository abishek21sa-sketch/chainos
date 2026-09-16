(function () {
  const popover = document.getElementById('sync-popover');
  if (!popover) return;
  popover.insertAdjacentHTML('beforeend', '<div class="fixture-import"><div class="fixture-import-actions"><button class="fixture-import-button" id="fixture-import-button" type="button">Import fixture JSON</button><button class="fixture-import-button fixture-template-button" id="fixture-template-button" type="button">Download template</button></div><input id="fixture-import-input" type="file" accept="application/json,.json" hidden><span class="fixture-import-help">Load a compatible local planning snapshot for review.</span></div>');
  const button = document.getElementById('fixture-import-button');
  const templateButton = document.getElementById('fixture-template-button');
  const input = document.getElementById('fixture-import-input');
  button.addEventListener('click', () => input.click());
  templateButton.addEventListener('click', () => {
    const template = { workspace: 'Northstar Mobility', asOf: '2025-09-16T09:42:00-05:00', suppliers: [{ id: 'SUP-EXAMPLE-01', name: 'Example Supplier', region: 'US South', reliabilityScore: 95, status: 'healthy' }], purchaseOrders: [{ id: 'PO-EXAMPLE-01', supplierId: 'SUP-EXAMPLE-01', partId: 'PART-EXAMPLE-01', quantity: 100, dueDate: '2025-09-20', status: 'open' }], shortages: [] };
    const download = document.createElement('a'); download.href = URL.createObjectURL(new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })); download.download = 'chainos-fixture-template.json';
    document.body.appendChild(download); download.click(); download.remove(); window.setTimeout(() => URL.revokeObjectURL(download.href), 0); showToast('Fixture template downloaded.');
  });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const fixture = JSON.parse(await file.text());
      const errors = [];
      if (!fixture || typeof fixture !== 'object') errors.push('Root must be a JSON object.');
      if (fixture && !fixture.workspace) errors.push('workspace is required.');
      if (fixture && !Array.isArray(fixture.suppliers)) errors.push('suppliers must be an array.');
      if (fixture && !Array.isArray(fixture.purchaseOrders)) errors.push('purchaseOrders must be an array.');
      if (fixture && !Array.isArray(fixture.shortages)) errors.push('shortages must be an array.');
      if (fixture?.suppliers?.some((supplier) => !supplier.id || !supplier.name)) errors.push('Every supplier needs an id and name.');
      if (fixture?.purchaseOrders?.some((order) => !order.id || !order.partId || !order.supplierId || !Number.isFinite(Number(order.quantity)))) errors.push('Every purchase order needs ids and a numeric quantity.');
      if (fixture?.shortages?.some((shortage) => !shortage.id || !shortage.partId || !Number.isFinite(Number(shortage.daysOfSupply)) || !Number.isFinite(Number(shortage.affectedHours)))) errors.push('Every shortage needs ids, daysOfSupply, and affectedHours.');
      if (fixture?.asOf && Number.isNaN(Date.parse(fixture.asOf))) errors.push('asOf must be a valid date.');
      if (errors.length) throw new Error(errors.slice(0, 3).join(' '));
      document.dispatchEvent(new CustomEvent('chainos:fixture-import', { detail: { fixture, fileName: file.name } }));
    } catch (error) {
      showToast(`Import failed: ${error.message}`);
    }
  });
}());
