// Behaviour checks for pass-1 fixes. Serve the repo root first, then: node tools/test.mjs [url]
import { chromium } from 'playwright';
const URL_ = process.argv[2] || 'http://localhost:8765/';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];
const check = (name, ok, info = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  (' + info + ')' : ''}`);

async function page(opts = {}) {
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, ...opts });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => { errors.push('dialog: ' + d.message()); d.dismiss(); });
  await p.goto(URL_ + '?debug=1', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.removeItem('concentric-last'));
  await p.waitForTimeout(300);
  return { p, errors };
}
const dotXY = (p, r, s) => p.evaluate(([r, s]) => {
  const R = window.__bench.renderer, d = R.dots.find(d => d.r === r && d.s === s), rect = R.canvas.getBoundingClientRect();
  return [rect.left + d.x, rect.top + d.y];
}, [r, s]);

{ // UX-01 clean switch while playing
  const { p, errors } = await page();
  await p.evaluate(() => window.__bench.loadItem('song-jingle-bells'));
  await p.click('#playPauseBtn'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const B = window.__bench, before = B.audio.voices.length;
    B.loadItem('song-brahms');
    const t = B.audio.now;
    const leftovers = B.audio.voices.filter(v => v.out.gain.value > 0.001 && v.t < t - 0.001).length;
    return { before, leftovers, playing: B.state.isPlaying, beats: B.state.beats };
  });
  await p.waitForTimeout(400);
  const phase = await p.evaluate(() => window.__bench.state.phase);
  check('UX-01 switching song while playing flushes old voices and restarts at beat 1', r.before > 0 && r.playing && r.beats === 12 && phase < 0.1, JSON.stringify({ ...r, phase: +phase.toFixed(3) }));
  check('no page errors (UX-01 run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // LT-03 click toggles; LT-04 reference frozen
  const { p, errors } = await page();
  await p.evaluate(() => window.__bench.loadItem('1.1'));
  const [x, y] = await dotXY(p, 0, 2);
  await p.mouse.click(x, y);
  let s = await p.evaluate(() => ({ user: window.__bench.state.userRings[0].steps[2].active, ref: window.__bench.state.referenceRings[0].steps[2].active, edit: window.__bench.state.tryMode }));
  check('LT-03 click removes an active dot', s.user === false && s.edit, JSON.stringify(s));
  check('LT-04 reference untouched by the edit', s.ref === true);
  await p.waitForTimeout(300); // the Edit controls opened and the wheel resized to sit above them: aim again
  const [x2, y2] = await dotXY(p, 0, 2);
  await p.mouse.click(x2, y2);
  s = await p.evaluate(() => window.__bench.state.userRings[0].steps[2].active);
  check('LT-03 second click adds it back', s === true);
  await p.evaluate(() => window.__bench.loadItem('1.3'));
  await p.click('#editToggle');
  await p.selectOption('#bottomRingDock select[data-act="inst"] >> nth=0', 'marimba');
  s = await p.evaluate(() => ({ ref: window.__bench.state.referenceRings[0].instrument, user: window.__bench.state.userRings[0].instrument }));
  check('LT-04 instrument change goes to your version, not the original', s.ref === 'sub_bass' && s.user === 'marimba', JSON.stringify(s));
  check('no page errors (edit run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Long-press opens the editor on touch
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL_, { waitUntil: 'load' }); await p.waitForTimeout(300);
  await p.evaluate(() => window.__bench.loadItem('song-canon')); // songs open with the drawer closed
  await p.waitForTimeout(300);
  const [x, y] = await dotXY(p, 0, 1);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await p.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(100);
  const open = await p.evaluate(() => !document.getElementById('dotEditorPopover').classList.contains('hidden'));
  const still = await p.evaluate(() => window.__bench.state.userRings[0].steps[1].active);
  check('LT-14 long-press opens the note editor on touch (and does not toggle)', open && still);
  await ctx.close();
}
{ // LT-02 import sanitising
  const { p, errors } = await page();
  const evil = JSON.stringify({ bpm: 999, beats: 99, rings: [{ name: '<img src=x onerror="alert(1)">Bass', instrument: 'nope', steps: [{ active: true, pitchClass: 99, octave: -3, accent: 7, chord: 'evil' }] }] });
  await p.setInputFiles('#importJsonFile', { name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(evil) });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const B = window.__bench, ring = B.state.userRings[0], st = ring.steps[0];
    return { imgs: document.querySelectorAll('#bottomRingDock img').length, name: document.querySelector('.dock-title').textContent, inst: ring.instrument, st, bpm: B.state.bpm, beats: B.state.beats };
  });
  check('LT-02 imported name is shown as text, no HTML injected', r.imgs === 0 && r.name.includes('<img'), r.name);
  check('LT-02 imported values are clamped', r.inst === 'marimba' && r.st.pitchClass === 11 && r.st.octave === 1 && r.st.accent === 3 && r.st.chord === 'single' && r.bpm === 220 && r.beats === 64, JSON.stringify(r));
  check('no alert / page errors on malicious import', !errors.length, errors.join('; '));
  await p.close();
}
{ // LT-07 chord lab 7ths, MZ-11 voice leading, LT-06 gates, AR-14 interruption
  const { p, errors } = await page();
  const r = await p.evaluate(async () => {
    const B = window.__bench, th = await import('./js/theory.js');
    B.loadItem('3.2');
    document.querySelector('[data-qual="dom7"]').click();
    const inv3 = !!document.querySelector('[data-voice="inv3"]');
    const rings7 = B.state.referenceRings.length;
    B.loadItem('4.3'); const jump = th.ringVoicing(B.state.referenceRings[1]).filter(Boolean);
    B.state.activeSceneIndex = 1; B.loadItem('4.3', true); const smooth = th.ringVoicing(B.state.referenceRings[1]).filter(Boolean);
    const move = v => v.slice(1).reduce((a, c, i) => a + c.reduce((s, m) => s + Math.min(...v[i].map(x => Math.abs(x - m))), 0), 0);
    B.loadItem('song-brahms');
    const gates = th.ringGates(B.state.referenceRings[1]);
    B.startPlayback();
    B.audio.onStateChange('interrupted');
    const overlay = !document.getElementById('resumeOverlay').classList.contains('hidden');
    return { inv3, rings7, jumpMove: move(jump), smoothMove: move(smooth), gates, overlay, playing: B.state.isPlaying };
  });
  check('LT-07 7th chords: 4 voices and a 3rd inversion in the inversion lab', r.inv3 && r.rings7 === 4, JSON.stringify({ inv3: r.inv3, rings: r.rings7 }));
  check('MZ-11 voice leading moves the voices far less than root-position jumps', r.smoothMove < r.jumpMove / 2, `semitones moved ${r.jumpMove} → ${r.smoothMove}`);
  check('LT-06 Brahms string chords hold for a full bar', r.gates.join(',') === '1,1,1,1', 'gate (in 3-beat steps) ' + r.gates.join(','));
  check('AR-14 interruption pauses and offers "Tap to resume"', r.overlay && !r.playing);
  check('no page errors (theory run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Every lesson and song loads and plays without errors; lint clean
  const { p, errors } = await page();
  const logs = []; p.on('console', m => logs.push(m.text()));
  await p.click('#playPauseBtn');
  const ids = await p.evaluate(async () => (await import('./js/content.js')).CURRICULUM.map(i => i.id));
  for (const id of ids) { await p.evaluate(i => window.__bench.loadItem(i), id); await p.waitForTimeout(150); }
  const lint = await p.evaluate(async () => (await import('./js/lint.js')).lintCurriculum((await import('./js/content.js')).CURRICULUM));
  check(`all ${ids.length} lessons/songs load and play without errors`, !errors.length, errors.join('; '));
  check('LT-17 data lint clean', lint.length === 0, lint.join('; '));
  await p.close();
}
{ // Pass 2: dock modes, Edit toggle + hold original, undo/redo, autosave, reset
  const { p, errors } = await page();
  await p.evaluate(() => window.__bench.loadItem('song-twinkle'));
  const vis = () => p.evaluate(() => ({ dock: !document.getElementById('dock').classList.contains('hidden'), inst: document.querySelectorAll('#bottomRingDock select[data-act="inst"]').length, mutes: document.querySelectorAll('#bottomRingDock [data-act="mute"]').length }));
  const rest = await vis();
  await p.click('#layersBtn'); const layers = await vis(); await p.click('#layersBtn');
  await p.click('#editToggle'); const editv = await vis();
  check('JI-02 dock hidden at rest; Layers shows mute/solo only; Edit shows full controls', !rest.dock && layers.dock && layers.inst === 0 && layers.mutes === 3 && editv.inst === 3, JSON.stringify({ rest, layers, editv }));
  const [x, y] = await dotXY(p, 2, 0);
  await p.mouse.click(x, y);
  let r = await p.evaluate(() => ({ user: window.__bench.state.userRings[2].steps[0].active, undo: window.__bench.state.undo.length }));
  await p.dispatchEvent('#holdPeekBtn', 'pointerdown', { pointerId: 1 });
  const peekRings = await p.evaluate(() => window.__bench.scheduler.hooks.getRings()[2].steps[0].active);
  await p.dispatchEvent('#holdPeekBtn', 'pointerup', { pointerId: 1 });
  const afterPeek = await p.evaluate(() => window.__bench.scheduler.hooks.getRings()[2].steps[0].active);
  check('JI-08 "Hold for original" plays the original, release returns to yours', r.user === false && peekRings === true && afterPeek === false);
  await p.keyboard.press('Control+z');
  const undone = await p.evaluate(() => window.__bench.state.userRings[2].steps[0].active);
  await p.keyboard.press('Control+Shift+z');
  const redone = await p.evaluate(() => window.__bench.state.userRings[2].steps[0].active);
  check('LT-16 undo and redo (Ctrl+Z / Ctrl+Shift+Z)', undone === true && redone === false);
  await p.waitForTimeout(600);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(300);
  await p.evaluate(() => window.__bench.loadItem('song-twinkle'));
  r = await p.evaluate(() => ({ edited: window.__bench.state.userEdited, dot: !document.getElementById('editDot').classList.contains('hidden'), ref: window.__bench.state.referenceRings[2].steps[0].active, user: window.__bench.state.userRings[2].steps[0].active }));
  check('LT-16 edits autosave and come back after a reload (original untouched)', r.edited && r.dot && r.ref === true && r.user === false, JSON.stringify(r));
  await p.click('#editToggle'); await p.click('#resetUserWheelBtn');
  r = await p.evaluate(() => ({ edited: window.__bench.state.userEdited, saved: !!localStorage.getItem('concentric-edit:song-twinkle:0'), user: window.__bench.state.userRings[2].steps[0].active }));
  check('Reset returns to the original and clears the saved copy', !r.edited && !r.saved && r.user === true, JSON.stringify(r));
  check('no page errors (pass 2 edit flow)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Pass 2: keyboard, letters/palette settings, sync offset, fixed caption height, phone sheet, offline
  const { p, errors } = await page();
  await p.evaluate(() => { localStorage.clear(); window.__bench.loadItem('1.1'); });
  await p.focus('#wheelCanvas');
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  const live1 = await p.textContent('#srLive');
  await p.keyboard.press('Enter');
  const r = await p.evaluate(() => ({ off: window.__bench.state.userRings[0].steps[2].active, live: document.getElementById('srLive').textContent }));
  check('DR-06 arrow keys move between notes, Enter toggles, screen reader is told', live1.includes('step 3 of 4') && r.off === false && r.live.includes('rest'), live1 + ' → ' + r.live);
  await p.click('#moreBtn'); await p.click('#settingsBtn');
  await p.click('#setPalette button[data-v="fifths"]'); await p.click('#setLetters button[data-v="on"]');
  await p.fill('#setSync', '200'); await p.dispatchEvent('#setSync', 'input');
  const st = await p.evaluate(async () => { const th = await import('./js/theory.js'); return { g: th.colorOf(7, 4), saved: JSON.parse(localStorage.getItem('concentric-settings')), extra: window.__bench.scheduler.extraLatency }; });
  check('JI-05 circle-of-fifths palette (G turns orange, next to C)', st.g.startsWith('hsl(30,'), st.g);
  check('Settings persist (letters, palette, headphone sync)', st.saved.letters === 'on' && st.saved.palette === 'fifths' && st.saved.syncMs === 200 && Math.abs(st.extra - 0.2) < 1e-9);
  await p.keyboard.press('Escape');
  await p.evaluate(() => window.__bench.loadItem('song-jingle-bells'));
  await p.evaluate(() => window.__bench.state.drawerOpen || document.getElementById('toggleDrawerBtn').click());
  await p.click('#playPauseBtn');
  const heights = new Set();
  for (let i = 0; i < 12; i++) { heights.add(await p.evaluate(() => document.getElementById('tryYourselfBtn').getBoundingClientRect().top)); await p.waitForTimeout(260); }
  check('UX-03 controls below the caption never move during playback', heights.size === 1, [...heights].join(','));
  check('no page errors (keyboard/settings run)', !errors.length, errors.join('; '));
  await p.close();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const m = await ctx.newPage();
  await m.goto(URL_, { waitUntil: 'load' }); await m.waitForTimeout(500);
  const geo = await m.evaluate(() => {
    const R = window.__bench.renderer, c = R.canvas.getBoundingClientRect(), sheet = document.getElementById('lessonDrawer').getBoundingClientRect();
    return { wheelBottom: Math.round(c.top + R.layout.cy + R.layout.outerR + 20), sheetTop: Math.round(sheet.top) };
  });
  check('Phones: the collapsed guide sheet does not cover the wheel', geo.wheelBottom <= geo.sheetTop, JSON.stringify(geo));
  const sw = await m.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return !!reg; });
  check('DR-05 offline service worker registers', sw);
  await ctx.close();
}
{ // Create mode (POST-06/07/08)
  const { p, errors } = await page();
  await p.evaluate(() => localStorage.clear());
  await p.evaluate(() => window.__bench.loadItem('2.3'));
  await p.click('#modePills button[data-mode="create"]');
  let r = await p.evaluate(() => ({ id: window.__bench.state.currentItemId, edit: window.__bench.state.tryMode, dock: document.getElementById('dock').dataset.mode }));
  check('POST-06 Create pill opens a template in Edit mode with ring controls', r.id === 'create-pop' && r.edit && r.dock === 'edit', JSON.stringify(r));
  const tpls = await p.$$eval('[data-tpl]', els => els.map(e => e.dataset.tpl));
  for (const t of tpls) { await p.click(`[data-tpl="${t}"]`); await p.waitForTimeout(150); }
  check('POST-07 all 5 starter templates load', tpls.length === 5 && !errors.length, tpls.join(', '));
  await p.click('[data-tpl="create-blank"]');
  await p.click('[data-bpc="7"]'); await p.click('[data-bch="maj7"]'); await p.click('[data-bacc="3"]');
  const [x, y] = await dotXY(p, 2, 1);
  await p.mouse.click(x, y);
  const painted = await p.evaluate(() => window.__bench.state.userRings[2].steps[1]);
  await p.mouse.click(x, y);
  const erased = await p.evaluate(() => window.__bench.state.userRings[2].steps[1].active);
  check('POST-08 brush paints the chosen note, chord and accent; a second click erases', painted.active && painted.pitchClass === 7 && painted.chord === 'maj7' && painted.accent === 3 && painted.octave === 4 && erased === false, JSON.stringify(painted));
  await p.click('#randomGrooveBtn'); await p.waitForTimeout(200);
  r = await p.evaluate(() => window.__bench.state.userRings.map(rg => rg.steps.filter(s => s.active).length));
  await p.click('#clearAllBtn');
  const cleared = await p.evaluate(() => window.__bench.state.userRings.every(rg => rg.steps.every(s => !s.active)));
  await p.click('#createUndoBtn');
  const back = await p.evaluate(() => window.__bench.state.userRings.map(rg => rg.steps.filter(s => s.active).length));
  check('POST-08 Random Groove fills every ring; Clear All empties; Undo restores', r.every(n => n > 0) && cleared && JSON.stringify(back) === JSON.stringify(r), `${JSON.stringify(r)} → cleared → ${JSON.stringify(back)}`);
  await p.waitForTimeout(600);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(300);
  await p.evaluate(() => window.__bench.loadItem('create-blank'));
  const kept = await p.evaluate(() => window.__bench.state.userRings.map(rg => rg.steps.filter(s => s.active).length));
  check('Create sketches are saved and come back after a reload', JSON.stringify(kept) === JSON.stringify(r), JSON.stringify(kept));
  await p.click('#modePills button[data-mode="learn"]');
  r = await p.evaluate(() => ({ id: window.__bench.state.currentItemId, edit: window.__bench.state.tryMode }));
  check('Learn & Songs pill returns to the last lesson', r.id === '2.3' && !r.edit, JSON.stringify(r));
  check('no page errors (Create run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Option 1: Clocks and Billie Jean cannot be exported or shared
  const { p, errors } = await page();
  const tryExport = async id => {
    await p.evaluate(i => window.__bench.loadItem(i), id);
    let downloaded = false;
    const dl = p.waitForEvent('download', { timeout: 1500 }).then(() => { downloaded = true; }).catch(() => {});
    await p.click('#moreBtn'); await p.click('#exportJsonBtn', { force: true }); await dl;
    const toast = await p.textContent('#toastBanner');
    return { downloaded, toast };
  };
  const c = await tryExport('song-clocks'), bj = await tryExport('song-billie-jean'), tw = await tryExport('song-twinkle');
  await p.evaluate(() => window.__bench.loadItem('song-clocks'));
  await p.click('#moreBtn'); await p.click('#recordAudioBtn', { force: true });
  const rec = await p.evaluate(() => window.__bench.audio.isRecording);
  check('Clocks and Billie Jean: no preset export or recording; message explains why', !c.downloaded && !bj.downloaded && !rec && c.toast.includes('Clocks') && bj.toast.includes('Billie Jean'), `${c.toast} | ${bj.toast}`);
  check('Other songs still export normally', tw.downloaded);
  check('no page errors (sharing block run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Phones: switching 2.2 scenes works from above the wheel and keeps the sheet as it was
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const m = await ctx.newPage(); const errs = []; m.on('pageerror', e => errs.push(e.message));
  await m.goto(URL_, { waitUntil: 'load' }); await m.waitForTimeout(300);
  await m.evaluate(() => window.__bench.loadItem('2.2')); await m.waitForTimeout(200);
  const vis = await m.isVisible('#stageScenes [data-scene="1"]');
  await m.tap('#stageScenes [data-scene="1"]'); await m.waitForTimeout(200);
  const r1 = await m.evaluate(() => ({ scene: window.__bench.state.activeSceneIndex, rings: window.__bench.state.referenceRings.length }));
  await m.tap('#sheetHandle'); await m.waitForTimeout(300);
  await m.tap('#interactiveLabContainer [data-scene="0"]'); await m.waitForTimeout(300);
  const r2 = await m.evaluate(() => ({ scene: window.__bench.state.activeSceneIndex, open: window.__bench.state.drawerOpen }));
  check('Phones: 2.2 half-step / Zarathustra switch above the wheel; switching from the sheet keeps it open', vis && r1.scene === 1 && r1.rings === 2 && r2.scene === 0 && r2.open && !errs.length, JSON.stringify({ vis, r1, r2, errs }));
  await ctx.close();
}

{ // Content pass: Library, songs, locked anthems, taal marks, sargam, lesson fixes
  const { p, errors } = await page();
  await p.click('#libraryBtn');
  const open = await p.isVisible('#librarySheet');
  await p.fill('#libSearch', 'frere');
  const found = await p.$$eval('#libList .lib-open', a => a.map(x => x.dataset.id));
  await p.click('#libList .lib-open >> nth=0');
  const cur = await p.evaluate(() => window.__bench.state.currentItemId);
  check('Library: search finds Frère Jacques (accent-insensitive) and opens it', open && found.includes('pd-frere-jacques') && found.includes('5.4') && cur === found[0] && !(await p.isVisible('#librarySheet')), JSON.stringify(found));
  await p.click('#libraryBtn'); await p.fill('#libSearch', '');
  await p.click('[data-chip="anthem"]');
  const anthems = await p.$$eval('#libList .lib-open', a => a.map(x => x.dataset.id));
  await p.click('[data-fav="anthem-uk"]');
  const fav = await p.evaluate(() => window.__bench.progress.isFav('anthem-uk'));
  await p.keyboard.press('Escape');
  check('Library: category chip filters; favourites toggle', anthems.length === 2 && anthems.every(i => i.startsWith('anthem')) && fav, JSON.stringify(anthems));
  const counts = await p.evaluate(async () => { const C = (await import('./js/content.js')).CURRICULUM; return { pd: C.filter(i => i.rights === 'pd' && i.id.startsWith('pd-')).length, total: C.length, m7: C.filter(i => i.id.startsWith('7.')).length, m8: C.filter(i => i.id.startsWith('8.')).length }; });
  check('Catalogue: 28 public-domain songs, Module 7 (6 lessons) and Module 8 (3 lessons)', counts.pd === 28 && counts.m7 === 6 && counts.m8 === 3, JSON.stringify(counts));
  await p.evaluate(() => window.__bench.loadItem('anthem-usa'));
  await p.click('#editToggle', { force: true });
  const [x, y] = await dotXY(p, 2, 0); await p.mouse.click(x, y);
  const locked = await p.evaluate(() => ({ edit: window.__bench.state.tryMode, ref: window.__bench.state.referenceRings[2].steps[0].active, user: window.__bench.state.userRings[2].steps[0].active }));
  check('Anthems are play-only: no edit mode, clicks do not change notes', !locked.edit && locked.user === locked.ref, JSON.stringify(locked));
  await p.evaluate(() => window.__bench.loadItem('7.1'));
  const taal = await p.evaluate(() => { const v = window.__bench.renderer.view(); return { marks: v.marks, label: v.labelOf && v.labelOf(7), letters: v.showLetters, drums: window.__bench.state.referenceRings[2].steps.map(s => s.drum).join(' ') }; });
  check('Teentaal: X/2/0/3 marks, sargam labels (G = Pa), tabla bols', JSON.stringify(taal.marks) === '{"0":"X","4":"2","8":"0","12":"3"}' && taal.label === 'Pa' && taal.letters && taal.drums.startsWith('dha dhin dhin dha'), JSON.stringify(taal));
  const fixes = await p.evaluate(async () => {
    const C = (await import('./js/content.js')).CURRICULUM, g = id => C.find(i => i.id === id);
    const clave = g('6.2').rings[2].steps.map((s, i) => s.active ? i : -1).filter(i => i >= 0).join(',');
    return { clave, star: JSON.stringify(g('2.2')).includes('Star Wars'), bj: g('1.4').behindSound.includes('Billie'), varney: g('1.3').source.includes('Varney'), newton: g('2.1').behindSound.includes('Newton') };
  });
  check('Lesson fixes: 3-2 son clave 0,3,6,10,12; no Star Wars in 2.2; 1.4 and 1.3 rewritten; 2.1 colour history', fixes.clave === '0,3,6,10,12' && !fixes.star && !fixes.bj && !fixes.varney && fixes.newton, JSON.stringify(fixes));
  check('no page errors (content run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Engine: swing delays off-beats; Faster each loop and Build up; Remix edits stay undoable
  const { p, errors } = await page();
  const r = await p.evaluate(async () => {
    const B = window.__bench; B.loadItem('8.3');
    B.state.activeSceneIndex = 2; B.loadItem('8.3', true);
    const times = []; const orig = B.audio.playStep.bind(B.audio);
    B.audio.playStep = (s, i, t, g, m) => { if (i === 'electric_piano') times.push(t); return orig(s, i, t, g, m); };
    B.startPlayback(); await new Promise(res => setTimeout(res, 1400));
    B.audio.playStep = orig;
    const d = times.slice(1, 5).map((t, i) => +(t - times[i]).toFixed(3));
    return { d };
  });
  const ratio = r.d[0] / r.d[1];
  check('Swing: hard swing makes long-short pairs (~2:1)', ratio > 1.8 && ratio < 2.2, JSON.stringify(r));
  const ramp = await p.evaluate(async () => {
    const B = window.__bench; B.loadItem('1.7');
    const b0 = B.state.bpm, lvl0 = B.state.buildLevel;
    B.startPlayback();
    const loop = B.state.beats * 60 / B.state.bpm;
    await new Promise(res => setTimeout(res, loop * 1000 + 600));
    return { b0, b1: B.state.bpm, lvl0, lvl1: B.state.buildLevel };
  });
  check('1.7 Accelerando: +6 BPM and one more ring after a loop', ramp.b1 === ramp.b0 + 6 && ramp.lvl0 === 1 && ramp.lvl1 === 2, JSON.stringify(ramp));
  await p.evaluate(() => { const B = window.__bench; B.state.isPlaying && document.getElementById('playPauseBtn').click(); B.loadItem('pd-ode-to-joy'); });
  await p.click('#moreBtn'); await p.click('#remixBtn');
  await p.click('#remixMinor');
  const minor = await p.evaluate(() => window.__bench.state.userRings[1].steps[0].chord);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+z');
  const back = await p.evaluate(() => window.__bench.state.userRings[1].steps[0].chord);
  check('Remix: major → minor chords, and Undo restores', minor === 'minor' && back === 'major', `${minor} → ${back}`);
  check('no page errors (engine run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Pass 3: share link round trip, embed, projector, assignment, notes, daily, ear check, poster, video, opener
  const { p, errors } = await page();
  await p.evaluate(() => window.__bench.loadItem('pd-twinkle'.replace('pd-', 'song-')));
  await p.click('#editToggle'); await p.waitForTimeout(400);
  const [x, y] = await dotXY(p, 2, 0); await p.mouse.click(x, y);
  await p.waitForFunction(() => window.__bench.state.userRings[2].steps[0].active === false, null, { timeout: 3000 }).catch(() => {});
  await p.click('#moreBtn'); await p.click('#shareLinkBtn');
  await p.waitForFunction(() => document.getElementById('shareLinkInput').value.includes('#w='), null, { timeout: 5000 });
  const link = await p.inputValue('#shareLinkInput');
  await p.fill('#assignTask', 'Make the melody end on C');
  const assign = await p.inputValue('#assignInput'), embed = await p.inputValue('#embedInput');
  await p.keyboard.press('Escape');
  const q = await b.newPage({ viewport: { width: 1366, height: 768 } }); const qe = []; q.on('pageerror', e => qe.push(e.message));
  await q.goto(link.replace(/^https?:\/\/[^/]+\//, URL_)); await q.waitForFunction(() => window.__bench && window.__bench.state.tryMode, null, { timeout: 8000 }).catch(() => {}); await q.waitForTimeout(300);
  const shared = await q.evaluate(() => ({ id: window.__bench.state.currentItemId, edit: window.__bench.state.tryMode, step: window.__bench.state.userRings[2].steps[0].active, ref: window.__bench.state.referenceRings[2].steps[0].active }));
  check('Share link carries your edited version (#w=) and opens it as an editable copy', link.includes('#w=') && shared.id === 'song-twinkle' && shared.edit && shared.step === false && shared.ref === true && !qe.length, JSON.stringify({ shared, qe }));
  await q.goto(assign.replace(/^https?:\/\/[^/]+\//, URL_)); await q.waitForTimeout(800);
  const banner = await q.textContent('#assignText');
  check('Assignment link shows the teacher’s task', banner === 'Make the melody end on C', banner);
  await q.goto(URL_ + '?item=pd-ode-to-joy&embed=1'); await q.waitForTimeout(600);
  const emb = await q.evaluate(() => ({ more: getComputedStyle(document.getElementById('moreBtn')).display, open: !document.getElementById('embedOpen').classList.contains('hidden') }));
  check('Embed mode: compact player with "Open in Concentric"', embed.includes('embed=1') && emb.more === 'none' && emb.open, JSON.stringify(emb));
  await q.goto(URL_ + '?item=4.4&present=1'); await q.waitForTimeout(600);
  const pres = await q.evaluate(() => ({ cls: document.body.classList.contains('present'), drawer: window.__bench.state.drawerOpen }));
  check('Projector view: present mode, guide closed', pres.cls && !pres.drawer, JSON.stringify(pres));
  await q.goto(URL_ + '?opener=1'); await q.waitForTimeout(600);
  const op = await q.evaluate(() => ({ id: window.__bench.state.currentItemId, mystery: document.body.classList.contains('mystery') }));
  await q.click('#mysteryReveal');
  const op2 = await q.evaluate(() => document.body.classList.contains('mystery'));
  check('First-visit opener: Canon in D in mystery mode, Reveal ends it', op.id === 'song-canon' && op.mystery && !op2, JSON.stringify(op));
  await q.close();
  await p.evaluate(() => window.__bench.loadItem('pd-amazing-grace'));
  await p.click('#moreBtn'); await p.click('#notesBtn');
  const notes = await p.evaluate(() => ({ heads: document.querySelectorAll('#notesStaff ellipse').length, chords: [...document.querySelectorAll('#notesStaff text')].filter(t => t.getAttribute('fill') === '#fbbf24').map(t => t.textContent) }));
  await p.keyboard.press('Escape');
  check('Show the notes: staff with noteheads and chord symbols', notes.heads === 9 && notes.chords.join(' ') === 'G C G', JSON.stringify(notes));
  await p.evaluate(() => { localStorage.removeItem('concentric-progress'); });
  await p.evaluate(() => window.__bench.startDaily()); await p.waitForTimeout(200);
  const daily = await p.evaluate(() => ({ opts: document.querySelectorAll('#mysteryOptions button').length, myst: document.body.classList.contains('mystery') }));
  const answer = await p.evaluate(() => window.__bench.state.currentItemId);
  const titles = await p.$$eval('#mysteryOptions button', a => a.map(x => x.textContent));
  const right = await p.evaluate(async t => { const C = (await import('./js/content.js')).CURRICULUM; const it = C.find(i => i.id === t); return it.title.replace(/^\d+\.\s*/, '').replace(/\s*\(.*?\)\s*/g, ' ').split(' — ')[0].trim(); }, answer);
  await p.click(`#mysteryOptions button >> nth=${titles.indexOf(right)}`);
  const ds = await p.evaluate(() => ({ st: window.__bench.progress.dailyState(), streak: window.__bench.progress.dailyStreak() }));
  check('Daily puzzle: 4 options, correct answer solves it in 1 and starts a streak', daily.opts === 4 && daily.myst && ds.st.solved && ds.st.tries === 1 && ds.streak === 1, JSON.stringify({ daily, ds, titles, right }));
  await p.evaluate(() => window.__bench.endMystery(false));
  await p.evaluate(() => window.__bench.loadItem('4.4'));
  await p.evaluate(() => window.__bench.startEarCheck()); await p.waitForTimeout(200);
  const ear = await p.evaluate(() => ({ opts: [...document.querySelectorAll('#mysteryOptions button')].map(b => b.textContent), ans: window.__bench.state.activeSceneIndex }));
  await p.click(`#mysteryOptions button >> nth=${ear.ans}`);
  const earRes = await p.textContent('#mysteryResult');
  check('Ear check: four cadence choices; the right one is marked right', ear.opts.length === 4 && earRes.startsWith('Right'), JSON.stringify({ ear, earRes }));
  await p.evaluate(() => window.__bench.endMystery(false));
  let dl = p.waitForEvent('download', { timeout: 4000 });
  await p.click('#moreBtn'); await p.click('#posterBtn'); await p.fill('#expComposer', 'Test Composer'); await p.click('#expGo');
  const poster = await dl.then(d => d.suggestedFilename()).catch(() => '');
  check('Poster PNG export (asks for name and composer; composer remembered)', poster.endsWith('-poster.png') && (await p.evaluate(() => window.__bench.settings.composer)) === 'Test Composer', poster);
  await p.evaluate(() => window.__bench.loadItem('pd-mars'));
  dl = p.waitForEvent('download', { timeout: 15000 });
  await p.click('#moreBtn'); await p.click('#videoBtn'); await p.click('#expGo');
  const video = await dl.then(d => d.suggestedFilename()).catch(() => '');
  check('Video export (9:16) saves a file after ~2 loops', /-9x16\.(mp4|webm)$/.test(video), video);
  await p.evaluate(() => window.__bench.loadItem('song-clocks'));
  await p.click('#moreBtn'); await p.click('#shareLinkBtn', { force: true });
  const blocked = await p.isVisible('#shareModal');
  check('Clocks: share link blocked too', !blocked);
  check('no page errors (pass 3 run)', !errors.length, errors.join('; '));
  await p.close();
}
{ // Legal pages exist and load
  const q = await b.newPage();
  const ok = [];
  for (const f of ['privacy.html', 'terms.html', 'NOTICE.txt', 'LICENSE', 'CONTENT-LICENSE.md']) { const r = await q.request.get(URL_ + f); ok.push(`${f}:${r.status()}`); }
  check('Legal pages: privacy, terms, NOTICE, LICENSE, CONTENT-LICENSE', ok.every(x => x.endsWith(':200')), ok.join(' '));
  await q.close();
}
console.log(results.join('\n'));
await b.close();
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
