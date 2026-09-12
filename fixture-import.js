(function () {
  const popover = document.getElementById('sync-popover');
  if (!popover) return;
  popover.insertAdjacentHTML('beforeend', '<div class="fixture-import"><button class="fixture-import-button" id="fixture-import-button" type="button">Import fixture JSON</button><input id="fixture-import-input" type="file" accept="application/json,.json" hidden><span class="fixture-import-help">Load a compatible local planning snapshot for review.</span></div>');
  const button = document.getElementById('fixture-import-button');
  const input = document.getElementById('fixture-import-input');
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const fixture = JSON.parse(await file.text());
      const valid = fixture && Array.isArray(fixture.suppliers) && Array.isArray(fixture.purchaseOrders) && Array.isArray(fixture.shortages);
      if (!valid) throw new Error('Fixture must include suppliers, purchaseOrders, and shortages arrays.');
      document.dispatchEvent(new CustomEvent('chainos:fixture-import', { detail: { fixture, fileName: file.name } }));
    } catch (error) {
      showToast(`Import failed: ${error.message}`);
    }
  });
}());
