(function () {
  const drawer = document.getElementById('detail-drawer');
  const action = document.getElementById('drawer-action');
  if (!drawer || !action) return;
  action.insertAdjacentHTML('beforebegin', '<div class="comments-block"><div class="drawer-label">Planner notes</div><div class="comments-list" id="comments-list"></div><div class="comment-compose"><textarea id="comment-input" aria-label="Add planner note" placeholder="Add context for the next reviewer…"></textarea><button class="secondary-button small" id="comment-submit" type="button">Add note</button></div></div>');
  const list = document.getElementById('comments-list');
  const input = document.getElementById('comment-input');
  const submit = document.getElementById('comment-submit');
  const storageKey = 'chainos-planner-comments';
  let activeType = 'shortage';
  function read() { try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (error) { return []; } }
  function write(entries) { localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, 20))); }
  function render() {
    list.replaceChildren();
    const entries = read().filter((entry) => entry.type === activeType).slice(0, 3);
    if (!entries.length) { list.innerHTML = '<div class="comment-empty">No notes on this exception yet.</div>'; return; }
    entries.forEach((entry) => {
      const item = document.createElement('div'); item.className = 'comment-item';
      const copy = document.createElement('p'); copy.textContent = entry.text;
      const time = document.createElement('small'); time.textContent = entry.time;
      item.append(copy, time); list.appendChild(item);
    });
  }
  document.addEventListener('chainos:drawer-open', (event) => { activeType = event.detail?.type || 'shortage'; render(); });
  submit.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) { showToast('Write a note before adding it.'); input.focus(); return; }
    const entries = read();
    entries.unshift({ type: activeType, text, time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) });
    write(entries); input.value = ''; render();
    document.dispatchEvent(new CustomEvent('chainos:activity', { detail: { label: 'Planner note added' } }));
    showToast('Planner note added to this exception.');
  });
  render();
}());
