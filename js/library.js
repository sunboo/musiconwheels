// Library sheet: search, category chips, recents, favourites and progress ticks.
// Replaces the long dropdown; works the same on phones (full-height sheet) and desktop (panel).
const CHIPS = [
  ['all', 'All'], ['lessons', 'Lessons'], ['songs', 'Songs'], ['nursery', 'Nursery'], ['holiday', 'Holiday'],
  ['world', 'Folk & World'], ['classical', 'Classical'], ['anthem', 'Anthems'], ['create', 'Create'], ['fav', '★ Favourites']
];
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function kindOf(it) {
  if (it.isCreate) return 'create';
  if (/^\d/.test(it.id)) return 'lessons';
  return it.category || 'pop';
}

export function createLibrary({ items, progress, onPick, getCurrent }) {
  const el = document.getElementById('librarySheet');
  const list = el.querySelector('#libList'), search = el.querySelector('#libSearch'), chips = el.querySelector('#libChips');
  let chip = 'all';
  const hay = new Map(items.map(it => [it.id, norm([it.title, it.hook, it.group, (it.tags || []).join(' '), it.source].join(' '))]));

  chips.innerHTML = CHIPS.map(([id, l]) => `<button class="lib-chip" data-chip="${id}" aria-pressed="false">${l}</button>`).join('');
  chips.addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (!b) return; chip = b.dataset.chip; render(); });
  search.addEventListener('input', () => render());

  function matches(it) {
    const k = kindOf(it);
    if (chip === 'fav' && !progress.isFav(it.id)) return false;
    if (chip === 'lessons' && k !== 'lessons') return false;
    if (chip === 'songs' && !it.isFamousSong) return false;
    if (chip === 'create' && k !== 'create') return false;
    if (['nursery', 'holiday', 'world', 'classical', 'anthem'].includes(chip) && k !== chip) return false;
    const q = norm(search.value.trim());
    return !q || q.split(/\s+/).every(w => hay.get(it.id).includes(w));
  }
  const row = it => {
    const done = progress.isDone(it.id), fav = progress.isFav(it.id), cur = getCurrent() === it.id;
    const flags = [it.locked ? '<span class="lib-flag" title="Play-only">play-only</span>' : '', it.shareable === false ? '<span class="lib-flag" title="Can’t be shared or exported">no sharing</span>' : ''].join('');
    return `<li class="lib-row${cur ? ' cur' : ''}">
      <button class="lib-open" data-id="${esc(it.id)}" ${cur ? 'aria-current="true"' : ''}>
        <span class="lib-tick${done ? ' on' : ''}" aria-label="${done ? 'Finished' : 'Not finished yet'}">${done ? '✓' : ''}</span>
        <span class="min-w-0 flex-1"><span class="lib-title">${esc(it.title)}</span>${flags}<span class="lib-sub">${esc(it.hook || '')}</span></span>
      </button>
      <button class="lib-fav${fav ? ' on' : ''}" data-fav="${esc(it.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from' : 'Add to'} favourites">★</button>
    </li>`;
  };

  function render() {
    chips.querySelectorAll('[data-chip]').forEach(b => { const on = b.dataset.chip === chip; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const sum = progress.summary();
    el.querySelector('#libProgress').textContent = `${sum.lessonsDone} of ${sum.lessons} lessons finished · ${sum.badges} of ${sum.badgeTotal} badges`;
    const earned = progress.badgeList().filter(b => b.on);
    el.querySelector('#libBadges').innerHTML = earned.length
      ? earned.map(b => `<span class="lib-badge on" title="${esc(b.desc)}">★ ${esc(b.label)}</span>`).join('')
      : '<span class="text-[13px] text-white/45">Earn badges by finishing lessons (play two full loops), remixing, ear checks and the daily puzzle.</span>';
    const shown = items.filter(matches);
    let html = '';
    const q = search.value.trim();
    if (!q && chip === 'all' && progress.data.recent.length) {
      const rec = progress.data.recent.map(id => items.find(i => i.id === id)).filter(Boolean).slice(0, 4);
      html += `<li class="lib-group">Recent</li>${rec.map(row).join('')}`;
    }
    const groups = new Map();
    shown.forEach(it => { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push(it); });
    groups.forEach((g, name) => {
      const done = g.filter(i => progress.isDone(i.id)).length;
      html += `<li class="lib-group">${esc(name)}<span>${done ? `${done}/${g.length} ✓` : g.length}</span></li>${g.map(row).join('')}`;
    });
    list.innerHTML = html || `<li class="lib-empty">Nothing matches “${esc(q)}”.</li>`;
  }

  list.addEventListener('click', e => {
    const f = e.target.closest('[data-fav]');
    if (f) { progress.toggleFav(f.dataset.fav); render(); return; }
    const o = e.target.closest('[data-id]');
    if (o) { close(); onPick(o.dataset.id); }
  });
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#libClose').onclick = () => close();
  el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });

  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    render();
    el.classList.remove('hidden');
    const cur = list.querySelector('[aria-current="true"]');
    if (cur) cur.scrollIntoView({ block: 'center' });
    if (window.matchMedia('(pointer: fine)').matches) search.focus(); else el.querySelector('#libClose').focus();
  }
  function close() {
    if (el.classList.contains('hidden')) return;
    el.classList.add('hidden');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  return { open, close, render, isOpen: () => !el.classList.contains('hidden') };
}
