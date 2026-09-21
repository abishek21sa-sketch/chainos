(function () {
  const popover = document.getElementById('sync-popover');
  if (!popover) return;
  const section = document.createElement('section');
  section.className = 'api-connection';
  section.innerHTML = '<div class="api-connection-title">OPTIONAL API SOURCE</div><label for="api-base-url">Render API URL</label><input id="api-base-url" type="url" inputmode="url" placeholder="https://chainos-api.onrender.com" autocomplete="url"><div class="api-connection-actions"><button id="api-connect-button" type="button">Connect</button><button id="api-disconnect-button" type="button">Use fixture</button></div><div class="api-connection-status" id="api-connection-status" role="status" aria-live="polite"></div>';
  popover.append(section);

  const input = document.getElementById('api-base-url');
  const status = document.getElementById('api-connection-status');
  const connectButton = document.getElementById('api-connect-button');
  const disconnectButton = document.getElementById('api-disconnect-button');
  const metaUrl = document.querySelector('meta[name="chainos-api-url"]')?.content?.trim() || '';
  input.value = localStorage.getItem('chainos-api-url') || window.CHAINOS_API_URL || metaUrl;
  status.textContent = input.value ? 'API URL saved in this browser.' : 'Using the bundled fixture.';

  connectButton.addEventListener('click', async () => {
    let parsed;
    try { parsed = new URL(input.value.trim()); } catch { status.textContent = 'Enter a valid API base URL.'; return; }
    const localDevelopment = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (!['https:', 'http:'].includes(parsed.protocol) || (parsed.protocol !== 'https:' && !localDevelopment) || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
      status.textContent = 'Use an HTTPS service origin (HTTP is allowed only for localhost).'; return;
    }
    const baseUrl = parsed.origin;
    connectButton.disabled = true;
    status.textContent = 'Checking API health…';
    try {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Health check returned ${response.status}.`);
      const health = await response.json();
      if (health.status !== 'ok') throw new Error('API health response was not valid.');
      localStorage.setItem('chainos-api-url', baseUrl);
      sessionStorage.removeItem('chainos-imported-fixture');
      await window.chainosApiAuthInit?.(baseUrl);
      status.textContent = 'API reachable. Loading its workspace snapshot…';
      await window.chainosReloadFixture?.();
      status.textContent = window.chainosFixtureSource === 'ChainOS API' ? `Connected · ${window.chainosFixture?.workspace || 'workspace'}.` : 'API unreachable for data; using the bundled fixture fallback.';
    } catch (error) {
      status.textContent = error.message || 'Could not connect to this API.';
    } finally {
      connectButton.disabled = false;
    }
  });

  disconnectButton.addEventListener('click', () => {
    localStorage.removeItem('chainos-api-url');
    sessionStorage.removeItem('chainos-imported-fixture');
    window.location.reload();
  });
}());
