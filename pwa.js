(function () {
  const status = document.createElement('div');
  status.className = 'offline-status'; status.id = 'offline-status'; status.textContent = 'Offline preview · local fixture available';
  document.body.appendChild(status);
  function updateConnectivity() { status.classList.toggle('visible', !navigator.onLine); }
  window.addEventListener('online', updateConnectivity); window.addEventListener('offline', updateConnectivity); updateConnectivity();
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(() => {});
}());
