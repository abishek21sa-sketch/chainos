(function () {
  const host = document.getElementById('secondary-view');
  const sidebarBottom = document.querySelector('.sidebar-bottom');
  const navItems = Array.from(document.querySelectorAll('.nav-item'));
  const labels = Object.fromEntries(navItems.map((item) => [item.dataset.view, item.textContent.trim().replace(/\s+\d+$/, '')]));
  const storageKey = 'chainos-saved-views';
  if (!host || !sidebarBottom || !navItems.length) return;
  sidebarBottom.insertAdjacentHTML('beforebegin', '<div class="saved-view-dock" id="saved-view-dock"><div class="nav-label">Saved views</div><div class="saved-view-list" id="saved-view-list"></div></div>');
  const dock = document.getElementById('saved-view-dock');
  const list = document.getElementById('saved-view-list');
  function read() { try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (error) { return []; } }
  function write(views) { localStorage.setItem(storageKey, JSON.stringify(views.slice(0, 6))); }
  function currentView() { return document.querySelector('.nav-item.active')?.dataset.view || 'overview'; }
  function renderList() {
    const views = read();
    dock.classList.toggle('has-items', views.length > 0);
    list.innerHTML = views.map((view) => `<button class="saved-view-item" data-saved-view="${view}">${labels[view] || view}</button>`).join('');
  }
  function renderControl() {
    const header = host.querySelector('.view-header');
    if (!header || currentView() === 'overview' || header.querySelector('.save-view-button')) return;
    const view = currentView();
    const button = document.createElement('button');
    button.className = 'save-view-button';
    button.dataset.saveView = view;
    header.appendChild(button);
    updateControl(button);
  }
  function updateControl(button) {
    const saved = read().includes(button.dataset.saveView);
    button.classList.toggle('saved', saved);
    button.textContent = saved ? '★ Saved' : '☆ Save view';
  }
  host.addEventListener('click', (event) => {
    const button = event.target.closest('.save-view-button');
    if (!button) return;
    const view = button.dataset.saveView;
    const views = read();
    const next = views.includes(view) ? views.filter((item) => item !== view) : [view, ...views];
    write(next); updateControl(button); renderList();
    showToast(next.includes(view) ? `${labels[view] || view} saved for quick access.` : `${labels[view] || view} removed from saved views.`);
  });
  list.addEventListener('click', (event) => {
    const button = event.target.closest('.saved-view-item');
    const target = navItems.find((item) => item.dataset.view === button?.dataset.savedView);
    if (target) target.click();
  });
  new MutationObserver(renderControl).observe(host, { childList: true, subtree: true });
  navItems.forEach((item) => item.addEventListener('click', () => window.setTimeout(renderControl, 0)));
  renderList(); renderControl();
}());
