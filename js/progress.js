// Progress, favourites, recents, badges and the daily puzzle. Stored only in this browser.
const KEY = 'concentric-progress';

export const BADGES = [
  { id: 'first-loop', label: 'First Spin', desc: 'Played a full loop.' },
  { id: 'five', label: 'Getting the Groove', desc: 'Finished 5 lessons.' },
  { id: 'fifteen', label: 'Theory Regular', desc: 'Finished 15 lessons.' },
  { id: 'module', label: 'Module Graduate', desc: 'Finished every lesson in a module.' },
  { id: 'songs10', label: 'Song Explorer', desc: 'Played 10 songs.' },
  { id: 'world', label: 'World Ears', desc: 'Played a taal and a raga.' },
  { id: 'composer', label: 'Composer', desc: 'Made your first sketch in Create.' },
  { id: 'remixer', label: 'Remixer', desc: 'Used Remix.' },
  { id: 'ears3', label: 'Sharp Ears', desc: '3 ear checks right.' },
  { id: 'daily3', label: 'Daily Habit', desc: 'A 3-day daily-puzzle streak.' }
];

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNum = s => Math.round(new Date(s + 'T12:00:00').getTime() / 864e5);

export function createProgress(store, items) {
  const p = { seen: {}, done: {}, fav: [], recent: [], badges: {}, ears: 0, daily: {} };
  try { Object.assign(p, JSON.parse(store.get(KEY) || '{}')); } catch (e) { /* fresh start */ }
  const save = () => store.set(KEY, JSON.stringify(p));
  const isLesson = it => /^\d/.test(it.id);
  const isSong = it => it.isFamousSong;

  function earn(id) {
    if (p.badges[id]) return null;
    p.badges[id] = localDay(); save();
    return BADGES.find(b => b.id === id);
  }
  function checkBadges() {
    const got = [];
    const done = items.filter(i => p.done[i.id]);
    const lessons = done.filter(isLesson).length;
    if (done.length) got.push(earn('first-loop'));
    if (lessons >= 5) got.push(earn('five'));
    if (lessons >= 15) got.push(earn('fifteen'));
    const groups = {};
    items.filter(isLesson).forEach(i => (groups[i.group] = groups[i.group] || []).push(i));
    if (Object.values(groups).some(g => g.every(i => p.done[i.id]))) got.push(earn('module'));
    if (done.filter(isSong).length >= 10) got.push(earn('songs10'));
    if (done.some(i => /^7\.[1-4]$/.test(i.id)) && done.some(i => /^7\.[56]$/.test(i.id))) got.push(earn('world'));
    return got.filter(Boolean);
  }

  return {
    data: p,
    visit(id) { p.seen[id] = 1; p.recent = [id, ...p.recent.filter(x => x !== id)].slice(0, 8); save(); },
    complete(id) { if (p.done[id]) return []; p.done[id] = localDay(); save(); return checkBadges(); },
    isDone: id => !!p.done[id],
    isFav: id => p.fav.includes(id),
    toggleFav(id) { p.fav = p.fav.includes(id) ? p.fav.filter(x => x !== id) : [id, ...p.fav]; save(); return p.fav.includes(id); },
    earn: id => { const b = earn(id); return b ? [b] : []; },
    earCorrect() { p.ears++; save(); return p.ears >= 3 ? this.earn('ears3') : []; },
    summary() {
      const lessons = items.filter(isLesson);
      return { lessonsDone: lessons.filter(i => p.done[i.id]).length, lessons: lessons.length, badges: Object.keys(p.badges).length, badgeTotal: BADGES.length };
    },
    badgeList: () => BADGES.map(b => ({ ...b, on: !!p.badges[b.id] })),
    // ---------- Daily puzzle ----------
    today: localDay,
    dailyNumber: () => dayNum(localDay()) - dayNum('2026-01-01') + 1,
    dailyState: () => p.daily[localDay()] || null,
    setDaily(state) {
      p.daily[localDay()] = state;
      const keys = Object.keys(p.daily).sort();
      if (keys.length > 60) keys.slice(0, keys.length - 60).forEach(k => delete p.daily[k]);
      save();
      return this.dailyStreak() >= 3 ? this.earn('daily3') : [];
    },
    dailyStreak() {
      let n = 0, d = dayNum(localDay());
      const solvedDays = new Set(Object.entries(p.daily).filter(([, s]) => s.solved).map(([k]) => dayNum(k)));
      if (!solvedDays.has(d)) d -= 1; // today not played yet: the streak is still alive
      while (solvedDays.has(d)) { n++; d--; }
      return n;
    }
  };
}

/** Deterministic pick for a given day, so everyone gets the same tune. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}
