(function () {
  const navItems = Array.from(document.querySelectorAll('.nav-item'));
  const validViews = new Set(navItems.map((item) => item.dataset.view));
  if (!navItems.length) return;

  function normalizeHash(item) {
    return item.dataset.view === 'overview' ? '' : `#${item.dataset.view}`;
  }

  function syncUrl(item) {
    const nextHash = normalizeHash(item);
    if (window.location.hash === nextHash) return;
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = nextHash;
    window.history.replaceState(null, '', nextUrl.href);
  }

  function applyHash() {
    const requestedView = decodeURIComponent(window.location.hash.slice(1));
    const target = navItems.find((item) => item.dataset.view === (validViews.has(requestedView) ? requestedView : 'overview'));
    if (!target) return;
    if (requestedView !== 'overview' && !validViews.has(requestedView)) syncUrl(target);
    if (!target.classList.contains('active')) target.click();
  }

  navItems.forEach((item) => item.addEventListener('click', () => syncUrl(item)));
  window.addEventListener('hashchange', applyHash);
  applyHash();
}());
