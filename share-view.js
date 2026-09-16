(function () {
  const host = document.getElementById('secondary-view');
  if (!host) return;
  const currentView = () => document.querySelector('.nav-item.active')?.dataset.view || 'overview';
  async function copyLink() {
    const url = new URL(window.location.href);
    url.hash = currentView();
    try {
      await navigator.clipboard.writeText(url.href);
    } catch (error) {
      const fallback = document.createElement('textarea'); fallback.value = url.href; fallback.setAttribute('readonly', ''); fallback.style.position = 'fixed'; fallback.style.opacity = '0'; document.body.appendChild(fallback); fallback.select(); document.execCommand('copy'); fallback.remove();
    }
    showToast(`Share link copied for ${currentView().replace('-', ' ')}.`);
  }
  function enhance() {
    const header = host.querySelector('.view-header');
    if (!header || currentView() === 'overview' || header.querySelector('.share-view-button')) return;
    const button = document.createElement('button'); button.className = 'share-view-button'; button.type = 'button'; button.textContent = 'Copy link';
    button.addEventListener('click', copyLink); header.appendChild(button);
  }
  new MutationObserver(enhance).observe(host, { childList: true, subtree: true });
  enhance();
}());
