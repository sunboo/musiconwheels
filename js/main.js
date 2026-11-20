// Concentric: app wiring. UI state lives here; audio, scheduling, drawing and theory live in their own modules.
import { CURRICULUM, makeSteps } from './content.js';
import {
  NOTE_NAMES, CHORDS, CHORD_LABELS, INSTRUMENTS, INST, formatNoteName, colorOf, midiOf, pcOf,
  ringVoicing, defaultRole, ROLE_LABEL, ROLE_COLOR, DRUM_VOICES, KIT_VOICES, TABLA_VOICES, hueOf, hueName, setPalette, getPalette
} from './theory.js';
import { createProgress, seeded } from './progress.js';
import { createLibrary } from './library.js';
import { encodePiece, decodePiece, baseUrl } from './share.js';
import { exportPoster, recordVideo } from './export.js';
import { renderStaff, pickMelody } from './notation.js';
import { AudioEngine } from './audio.js';
import { Scheduler } from './scheduler.js';
import { WheelRenderer } from './render.js';
import { track } from './analytics.js';
import { randomGroove } from './groove.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const EMBED = params.has('embed'), PRESENT = params.has('present');
document.body.classList.toggle('embed', EMBED);
document.body.classList.toggle('present', PRESENT);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Settings (persisted per browser) ----------
const settings = Object.assign({ quality: 'auto', palette: 'rainbow', letters: 'off', haptics: 'on', syncMs: 0, visual: 'off', sargam: 'on' },
  (() => { try { return JSON.parse(store.get('concentric-settings') || '{}'); } catch (e) { return {}; } })());
const saveSettings = () => store.set('concentric-settings', JSON.stringify(settings));
setPalette(settings.palette);

// ---------- Quality tier (AR-07) ----------
function detectTier() {
  const forced = params.get('quality') || (settings.quality !== 'auto' ? settings.quality : null);
  if (forced === 'lite' || forced === 'full') return forced;
  const cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8;
  return cores <= 4 || mem <= 2 ? 'lite' : 'full';
}
let tier = detectTier();
document.body.classList.toggle('lite', tier === 'lite');

// ---------- State ----------
const emptyMix = () => ({ muted: [false, false, false, false, false], solo: [false, false, false, false, false] });
const state = {
  currentItemId: '1.1',
  activeSceneIndex: 0,
  isPlaying: false,
  bpm: 84,
  beats: 4,
  phase: 0,
  tryMode: false,        // editing your version
  userEdited: false,     // your version differs from the original (or was restored)
  peekHolding: false,    // "Hold for original"
  layersOpen: false,
  referenceRings: [],
  userRings: [],
  mix: emptyMix(),
  colorLabPC: 0, colorLabOct: 4,
  chordLabRoot: 7, chordLabQuality: 'major', chordLabVoicing: 'open',
  hovered: null,
  editing: null,
  focus: null,
  drawerOpen: true,
  behindSoundOpen: false,
  version: 0,
  lastBeat: -1,
  undo: [], redo: [],
  brush: { pc: 4, oct: 'auto', chord: 'single', acc: 2, drum: 'kick' }, // Create-mode brush (POST-08)
  createDock: false,
  remix: { swing: null, faster: false, build: false }, // Remix and tempo ramps
  buildLevel: 99,
  startBpm: 84
};
const progress = createProgress(store, CURRICULUM);
const mystery = { mode: null, loading: false, answer: null, tries: 0, done: false };

const audio = new AudioEngine(tier);
const loopSeconds = () => state.beats * 60 / state.bpm;
const getActiveRings = () => (!state.tryMode || state.peekHolding) ? state.referenceRings : state.userRings;
function isAudible(r) {
  if (state.remix.build && r >= state.buildLevel) return false;
  const anySolo = state.mix.solo.some(Boolean);
  return anySolo ? !!state.mix.solo[r] : !state.mix.muted[r];
}
const swingNow = () => state.remix.swing ?? (currentScene() || {}).swing ?? currentItem().swing ?? 0.5;
const scheduler = new Scheduler(audio, { getRings: getActiveRings, isAudible, getLoop: loopSeconds, version: () => state.version, getBeats: () => state.beats, getSwing: swingNow });
scheduler.extraLatency = settings.syncMs / 1000;
const canvas = $('wheelCanvas');
const renderer = new WheelRenderer(canvas, $('wheelStatic'), () => ({
  rings: getActiveRings(), beats: state.beats, bpm: state.bpm, isAudible,
  hovered: state.hovered, editing: state.editing, focus: state.focus, playing: state.isPlaying,
  phase: state.phase, flash: scheduler.flash, flashDur: scheduler.flashDur,
  audioNow: audio.now - audio.outputLatency - scheduler.extraLatency,
  editMode: state.tryMode && !state.peekHolding, showLetters: settings.letters === 'on' || sargamOn(), reduceMotion,
  marks: ((currentScene() || currentItem()).marks) || null, labelOf: sargamOn() ? sargamLabel : null
}));
if (tier === 'lite') renderer.maxDpr = 1;

// ---------- Helpers ----------
const cloneRings = rings => JSON.parse(JSON.stringify(rings));
function withRoles(rings) {
  rings.forEach((r, i) => { r.role = r.role || defaultRole(i, rings.length, r.instrument); delete r.muted; delete r.solo; });
  return rings;
}
function deepFreeze(o) { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); }
const haptic = ms => { if (settings.haptics === 'on' && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } };

function showToast(msg, ms = 2600) {
  const el = $('toastBanner');
  el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), ms);
}
const announce = msg => { $('srLive').textContent = msg; };
const celebrate = badges => { if (badges && badges.length) showToast(`★ New badge: ${badges.map(b => b.label).join(', ')}`, 3800); };

// ---------- Sargam (Module 7): Sa Re Ga … relative to the lesson's tonic ----------
const SARGAM = ['Sa', 're', 'Re', 'ga', 'Ga', 'Ma', 'Ma♯', 'Pa', 'dha', 'Dha', 'ni', 'Ni'];
function sargamOn() { const it = CURRICULUM.find(i => i.id === state.currentItemId); return !!(it && it.sargam) && settings.sargam === 'on'; }
const sargamLabel = pc => SARGAM[pcOf(pc - (currentItem().tonic || 0))];
const noteName = (pc, oct) => (sargamOn() ? `${sargamLabel(pc)} (${formatNoteName(pc, oct)})` : formatNoteName(pc, oct));

// ---------- Play-only items (anthems) ----------
const isLocked = () => !!currentItem().locked;
function lockedToast() { showToast('Anthems are play-only, out of respect: they can’t be edited or remixed.', 3600); }

/** Something about the rings changed: redraw, refresh voicing caches, warm the sound cache. */
let warmTimer = null;
function bump() {
  state.version++;
  renderer.invalidate();
  requestDraw();
  clearTimeout(warmTimer);
  warmTimer = setTimeout(() => audio.prewarm(getActiveRings()), 60);
}

const isCreate = () => !!currentItem().isCreate;
/** Songs whose signature riff is copyrighted can be played and edited, but not exported or shared. */
const canShare = () => currentItem().shareable !== false;
function blockedShare() {
  if (canShare()) return false;
  showToast(`Sharing is off for ${currentItem().title.replace(/^\d+\.\s*/, '').split(' — ')[0]}: its riff is copyrighted. You can still play and edit it here.`, 4200);
  return true;
}
function currentItem() { return CURRICULUM.find(i => i.id === state.currentItemId) || CURRICULUM[0]; }
function currentScene(item = currentItem()) { return item.labType === 'sceneFlip' && item.scenes ? item.scenes[state.activeSceneIndex] : null; }
const saveKey = () => `concentric-edit:${state.currentItemId}:${state.activeSceneIndex}`;

// ---------- Editing, undo/redo, autosave (LT-04, LT-16) ----------
const snapshot = () => JSON.stringify({ rings: state.userRings, beats: state.beats });
function restoreSnapshot(json) {
  const s = JSON.parse(json);
  state.userRings = s.rings;
  if (s.beats !== state.beats) setBeats(s.beats);
}
let saveTimer = null;
function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.set(saveKey(), snapshot()), 400);
}

/** All edits go through here, so the original stays frozen and every change can be undone. */
function edit(fn, { structural = false } = {}) {
  if (isLocked()) { lockedToast(); return; }
  if (!state.tryMode) enterEditMode();
  if (state.peekHolding) peek(false);
  state.undo.push(snapshot());
  if (state.undo.length > 60) state.undo.shift();
  state.redo = [];
  fn(state.userRings);
  state.userEdited = true;
  autosave();
  bump();
  if (structural) renderDock(); else updateDockValues();
  updateUndoUI();
  if (!edit.tracked) { edit.tracked = true; track('edit'); }
  if (isCreate()) { celebrate(progress.earn('composer')); if (!edit.created) { edit.created = true; track('create-first-edit'); } }
  updateMatch();
}
/** How close your version is to the original (shown while editing). */
function matchPct() {
  const a = state.referenceRings, b = state.userRings;
  let same = 0, total = 0;
  for (let r = 0; r < Math.max(a.length, b.length); r++) {
    const x = a[r], y = b[r];
    if (!x || !y || x.steps.length !== y.steps.length) { total += Math.max(x ? x.steps.length : 0, y ? y.steps.length : 0); continue; }
    x.steps.forEach((s, i) => {
      const t = y.steps[i]; total++;
      if (!s.active && !t.active) same++;
      else if (s.active && t.active && s.pitchClass === t.pitchClass && s.octave === t.octave && s.chord === t.chord && (s.drum || '') === (t.drum || '')) same++;
    });
  }
  return total ? Math.round((same / total) * 100) : 100;
}
function updateMatch() {
  if (!state.tryMode || isCreate()) return;
  $('editBadgeText').textContent = isMobile() ? `Editing · ${matchPct()}% like the original` : `Editing — your version · ${matchPct()}% like the original`;
}
function undo() {
  if (!state.undo.length) return;
  state.redo.push(snapshot());
  restoreSnapshot(state.undo.pop());
  autosave(); bump(); renderDock(); updateUndoUI(); closeDotPopover(); updateMatch();
}
function redo() {
  if (!state.redo.length) return;
  state.undo.push(snapshot());
  restoreSnapshot(state.redo.pop());
  autosave(); bump(); renderDock(); updateUndoUI(); closeDotPopover(); updateMatch();
}
function updateUndoUI() {
  $('undoBtn').disabled = !state.undo.length;
  $('redoBtn').disabled = !state.redo.length;
  const cu = document.getElementById('createUndoBtn'); if (cu) cu.disabled = !state.undo.length;
}

function enterEditMode() {
  if (isLocked()) { lockedToast(); return; }
  state.tryMode = true;
  if (!state.userEdited) state.userRings = withRoles(cloneRings(state.referenceRings));
  else {
    const saved = store.get(saveKey());
    if (saved) { try { const b = JSON.parse(saved).beats; if (b && b !== state.beats) setBeats(b); } catch (e) {} }
  }
  refreshModeUI();
  bump();
}
function exitEditMode() {
  state.tryMode = false;
  state.peekHolding = false;
  closeDotPopover();
  const src = currentScene() || currentItem();
  if (src.beats && src.beats !== state.beats) setBeats(src.beats);
  refreshModeUI();
  bump();
}
function resetEdits() {
  state.undo.push(snapshot());
  state.userRings = withRoles(cloneRings(state.referenceRings));
  state.userEdited = false;
  store.del(saveKey());
  closeDotPopover();
  bump(); renderDock(); updateUndoUI();
  showToast(isCreate() ? 'Back to the template. Undo brings your sketch back.' : 'Back to the original. Undo brings your edits back.');
}

function peek(on) {
  if (state.peekHolding === on) return;
  state.peekHolding = on;
  refreshModeUI();
  bump();
}

// ---------- Playback ----------
function setPlayUI() {
  $('playIcon').classList.toggle('hidden', state.isPlaying);
  $('pauseIcon').classList.toggle('hidden', !state.isPlaying);
  $('playLabel').textContent = state.isPlaying ? 'Pause' : 'Play';
  $('playPauseBtn').setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
}
function startPlayback() {
  audio.unlock();
  audio.prewarm(getActiveRings());
  scheduler.start(state.phase);
  state.isPlaying = true;
  state.lastBeat = -1;
  state.loopsPlayed = 0;
  if (state.remix.build && state.phase < 0.01) { state.buildLevel = 1; renderer.invalidate(); }
  setPlayUI();
  requestDraw();
  track('play');
}
function pausePlayback() {
  if (state.isPlaying) state.phase = scheduler.audiblePhase();
  scheduler.stop();
  state.isPlaying = false;
  setPlayUI();
  requestDraw();
}
function stopAndReset() {
  pausePlayback();
  if (state.remix.faster) setBpm(state.startBpm);
  if (state.remix.build) { state.buildLevel = 1; renderer.invalidate(); }
  state.phase = 0;
  state.lastBeat = -1;
  updateCaption(0);
  requestDraw();
}
const togglePlay = () => (state.isPlaying ? pausePlayback() : startPlayback());

function setBpm(v) {
  v = Math.max(40, Math.min(220, Math.round(v)));
  if (v === state.bpm) return;
  const old = loopSeconds();
  state.bpm = v;
  scheduler.rebase(old, loopSeconds());
  $('bpmInput').value = v;
  renderer.invalidate(); requestDraw();
}
function setBeats(v) {
  const old = loopSeconds();
  state.beats = v;
  scheduler.rebase(old, loopSeconds());
  $('beatsSelect').value = String(v);
  renderer.invalidate(); requestDraw();
}

// Interruptions: calls, Siri, Bluetooth reconnects (AR-14)
audio.onStateChange = s => {
  if (state.isPlaying && (s === 'suspended' || s === 'interrupted')) {
    pausePlayback();
    $('resumeOverlay').classList.remove('hidden');
  }
};
$('resumeBtn').onclick = () => { $('resumeOverlay').classList.add('hidden'); startPlayback(); };

// ---------- Frame loop: runs only while something moves (AR-04) ----------
let rafId = 0, lastFrame = 0, dragging = false;
const frameTimes = [];
function requestDraw() { if (!rafId) rafId = requestAnimationFrame(frame); }
function frame(ts) {
  rafId = 0;
  const minGap = tier === 'lite' ? 30 : 0;
  if (state.isPlaying && ts - lastFrame < minGap) { requestDraw(); return; }
  if (lastFrame && state.isPlaying) watchPerformance(ts - lastFrame);
  lastFrame = ts;
  if (state.isPlaying) {
    const prev = state.phase;
    state.phase = scheduler.audiblePhase();
    if (state.phase < prev - 0.5) onLoopWrap();
    const beat = Math.floor(state.phase * state.beats) % state.beats;
    if (beat !== state.lastBeat) { state.lastBeat = beat; updateCaption(beat); if (settings.visual === 'on') flashBeat(beat); }
  }
  const animating = renderer.draw();
  if (state.isPlaying || animating || dragging) requestDraw();
}

function onLoopWrap() {
  if (++state.loopsPlayed === 2) {
    track('lesson-complete');
    if (!mystery.mode) { celebrate(progress.complete(state.currentItemId)); }
  }
  if (state.remix.faster) setBpm(Math.min(208, state.bpm + 6));
  if (state.remix.build && state.buildLevel < getActiveRings().length) { state.buildLevel++; renderer.invalidate(); updateMixUI(); }
}
function flashBeat(beat) {
  const st = $('wheelStage');
  st.classList.remove('beat-flash', 'beat-one');
  void st.offsetWidth; // restart the animation
  st.classList.add(beat === 0 ? 'beat-one' : 'beat-flash');
  if (settings.haptics === 'on' && navigator.vibrate) { try { navigator.vibrate(beat === 0 ? 35 : 12); } catch (e) {} }
}

function watchPerformance(dt) {
  if (tier === 'lite' || document.hidden || settings.quality === 'full') return;
  frameTimes.push(dt);
  if (frameTimes.length < 120) return;
  const sorted = frameTimes.splice(0).sort((a, b) => a - b);
  if (sorted[60] > 24) { applyTier('lite'); showToast('Switched to Lite mode for smoother playback.'); }
}
function applyTier(t) {
  tier = t;
  document.body.classList.toggle('lite', t === 'lite');
  renderer.setMaxDpr(t === 'lite' ? 1 : 2);
  audio.maxVoices = t === 'lite' ? 12 : 24;
  requestDraw();
}

function updateCaption(beat) {
  const item = currentItem(), scene = currentScene(item);
  const caps = (scene || item).beatCaptions || [];
  $('liveBeatBadge').textContent = `Beat ${beat + 1} / ${state.beats}`;
  $('liveBeatCaption').textContent = caps[beat] || '';
  $('stageCaption').textContent = caps[beat] || '';
}

// ---------- Loading lessons & songs (UX-01) ----------
function loadItem(id, keepScene = false) {
  const wasPlaying = state.isPlaying;
  if (wasPlaying) pausePlayback();   // flushes every scheduled voice
  state.phase = 0;
  state.lastBeat = -1;
  state.currentItemId = id;
  const item = currentItem();
  if (!keepScene) state.activeSceneIndex = 0;
  state.tryMode = false; state.peekHolding = false;
  state.mix = emptyMix();
  state.dockRing = 0;
  state.remix = { swing: null, faster: !!(item.autoRemix && item.autoRemix.faster), build: !!(item.autoRemix && item.autoRemix.build) };
  state.buildLevel = state.remix.build ? 1 : 99;
  state.undo = []; state.redo = [];
  state.focus = null;
  closeDotPopover();

  const src = currentScene(item) || item;
  state.beats = src.beats || item.beats;
  state.bpm = src.bpm || item.bpm;
  state.startBpm = state.bpm;

  if (item.labType === 'chordLab') {
    if (!keepScene) {
      state.chordLabRoot = item.labRoot ?? 0;
      state.chordLabQuality = item.labQuality ?? 'major';
      state.chordLabVoicing = item.labVoicing ?? 'open';
    }
    state.referenceRings = buildChordLabRings(item);
  } else {
    if (item.labType === 'colorLab') { state.colorLabPC = item.selectedPC ?? 0; state.colorLabOct = item.selectedOct ?? 4; }
    state.referenceRings = withRoles(cloneRings(src.rings));
  }
  if (DEBUG) deepFreeze(state.referenceRings);

  // Restore saved edits for this piece, if any (shown when you press Edit).
  state.userEdited = false;
  state.userRings = cloneRings(state.referenceRings);
  const saved = store.get(saveKey());
  if (saved) {
    try { state.userRings = sanitizePreset({ rings: JSON.parse(saved).rings }).rings; state.userEdited = true; }
    catch (e) { store.del(saveKey()); }
  }

  setDrawerOpen(keepScene ? state.drawerOpen : isMobile() ? false : !item.isFamousSong); // switching scenes keeps the guide as it was
  syncControlsUI();
  renderDrawerContent();
  refreshModeUI();
  updateCaption(0);
  updateUndoUI();
  bump();
  if (item.shareable === false && audio.isRecording) $('recordAudioBtn').click();
  document.body.classList.toggle('create-mode', !!item.isCreate);
  store.set(item.isCreate ? 'concentric-last-create' : 'concentric-last-learn', id);
  store.set('concentric-last', id);
  progress.visit(id);
  $('libraryBtnLabel').textContent = item.title;
  const ts = (currentScene(item) || {}).timeSig || item.timeSig;
  $('timeSigBadge').textContent = ts || ''; $('timeSigBadge').classList.toggle('hidden', !ts);
  document.body.classList.toggle('locked-item', !!item.locked);
  if (mystery.mode && !mystery.loading) endMystery(false);
  state.createDock = false;
  if (item.isCreate) { enterEditMode(); track('create-open'); }   // Create mode starts in Edit with the brush ready (POST-06)
  else if (state.userEdited) showToast('Your saved edits are kept. Press Edit to see them.');
  if (item.isCreate && state.userEdited) showToast('Your saved sketch is back. Reset returns to the template.');
  if (wasPlaying) startPlayback();
}

const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
function setDrawerOpen(open) {
  state.drawerOpen = open;
  const d = $('lessonDrawer');
  d.classList.toggle('drawer-collapsed', !open);
  $('toggleDrawerBtn').setAttribute('aria-expanded', String(open));
  $('drawerToggleLabel').textContent = currentItem().isFamousSong ? 'Song Story' : 'Learn';
  document.body.classList.toggle('drawer-closed', !open);
}

function syncControlsUI() {
  $('curriculumSelect').value = state.currentItemId;
  $('bpmInput').value = Math.round(state.bpm);
  $('beatsSelect').value = String(state.beats);
}

/** Edit toggle, badges, dock visibility (JI-02, JI-08, DR-03). */
function refreshModeUI() {
  const editing = state.tryMode;
  const et = $('editToggle');
  et.setAttribute('aria-pressed', String(editing));
  et.classList.toggle('on', editing);
  $('editDot').classList.toggle('hidden', !(state.userEdited && !editing));
  $('editBadge').classList.toggle('hidden', !editing || state.peekHolding);
  $('peekBadge').classList.toggle('hidden', !state.peekHolding);
  $('tryYourselfBtn').textContent = editing ? 'Stop editing' : 'Edit this →';
  $('tryYourselfBtn').classList.toggle('hidden', isLocked());
  et.setAttribute('aria-disabled', String(isLocked()));
  et.title = isLocked() ? 'Play-only: anthems can’t be edited' : 'Edit your own version';
  $('layersBtn').setAttribute('aria-pressed', String(state.layersOpen));
  $('layersBtn').classList.toggle('on', state.layersOpen);
  const create = isCreate();
  { // phones: one icon button switches between Create (+) and back to Learn (book)
    const mc = $('mobileCreateBtn');
    $('mcPlus').classList.toggle('hidden', create); $('mcBook').classList.toggle('hidden', !create);
    mc.classList.toggle('on', create);
    mc.setAttribute('aria-label', create ? 'Back to lessons and songs' : 'Create your own');
    mc.title = mc.getAttribute('aria-label');
  }
  document.querySelectorAll('#modePills button').forEach(b => { const on = (b.dataset.mode === 'create') === create; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  $('editBadgeText').textContent = create ? 'Create — your sketch' : 'Editing — your version';
  updateMatch();
  $('dockBrushBtn').classList.toggle('hidden', !(create && isMobile()));
  const dock = $('dock');
  const hideForBrush = editing && create && isMobile() && !state.createDock; // phones: brush sheet first, ring controls on request
  const mode = editing && !hideForBrush ? 'edit' : !editing && state.layersOpen ? 'layers' : 'none';
  dock.classList.toggle('hidden', mode === 'none');
  dock.dataset.mode = mode;
  document.body.classList.toggle('dock-open', mode !== 'none');
  renderDock();
}

// ---------- Chord labs (LT-07: every chord tone is voiced) ----------
function stepAt(pc, oct, acc, extra = {}) { return { pc: pcOf(pc), oct, acc, ...extra }; }
function ascending(pcs, startOct) {
  // place pitch classes in ascending order from startOct
  const out = []; let prev = -1;
  pcs.forEach(pc => { let m = midiOf(pc, startOct); while (m <= prev) m += 12; out.push(m); prev = m; });
  return out;
}
const fromMidi = (m, acc, extra) => ({ pc: pcOf(m), oct: Math.floor(m / 12) - 1, acc, ...extra });

function buildChordLabRings(item) {
  const root = state.chordLabRoot, qual = state.chordLabQuality, voicing = state.chordLabVoicing;
  const ivs = (CHORDS[qual] || CHORDS.major).map(i => i % 12);
  const tones = ivs.map(i => pcOf(root + i));
  const ring = (name, instrument, role, n, map) => ({ name, instrument, role, voiceLead: false, steps: makeSteps(n, map) });

  if (item.chordLabMode === 'compareQualities') {
    return [
      ring('Root Bass', 'sub_bass', 'bass', 4, { 0: stepAt(root, 2, 2), 1: stepAt(root, 2, 3), 2: stepAt(root, 2, 3) }),
      ring('Unison · Maj · Min', 'grand_piano', 'harmony', 4, { 0: stepAt(root, 4, 3, { chord: 'single' }), 1: stepAt(root, 4, 3, { chord: 'major' }), 2: stepAt(root, 4, 3, { chord: 'minor' }) })
    ];
  }
  if (item.chordLabMode === 'inversions') {
    const k = { root: 0, inv1: 1, inv2: 2, inv3: 3 }[voicing] % tones.length;
    const order = tones.slice(k).concat(tones.slice(0, k));
    const upper = ascending(order.slice(1), 3);
    const insts = ['grand_piano', 'marimba', 'electric_piano'];
    return [
      ring('Inversion Bass', 'sub_bass', 'bass', 4, { 0: stepAt(order[0], 2, 3), 2: stepAt(order[0], 2, 2) }),
      ...upper.map((m, i) => ring(`Voice ${i + 2}`, insts[i], i === upper.length - 1 ? 'melody' : 'harmony', 4, { 0: fromMidi(m, 3), 2: fromMidi(m, 2) }))
    ];
  }
  if (item.chordLabMode === 'orchestral') {
    if (voicing === 'close') return [ring('Close Block Chord', 'grand_piano', 'harmony', 4, { 0: stepAt(root, 3, 3, { chord: qual }) })];
    const rings = [
      ring('Orchestral Bass (Root)', 'sub_bass', 'bass', 4, { 0: stepAt(tones[0], 2, 3) }),
      ring('Piano (5th)', 'grand_piano', 'harmony', 4, { 0: stepAt(tones[2], 3, 3) }),
      ring('Marimba (3rd)', 'marimba', 'harmony', 4, { 0: stepAt(tones[1], 4, 3) })
    ];
    if (tones[3] !== undefined) rings.push(ring('Pad (7th)', 'strings', 'melody', 4, { 0: stepAt(tones[3], 4, 3) }));
    else rings[2].role = 'melody';
    return rings;
  }
  if (item.chordLabMode === 'arpeggio') {
    if (voicing === 'block') return [
      ring('Block Bass', 'sub_bass', 'bass', 4, { 0: stepAt(root, 2, 3) }),
      ring('Block Chord', 'grand_piano', 'melody', 4, { 0: stepAt(root, 4, 3, { chord: qual }) })
    ];
    const arp = ascending(tones.length > 3 ? tones : [...tones, tones[0]], 4);
    return [
      ring('Arpeggio Bass', 'sub_bass', 'bass', 4, { 0: stepAt(root, 2, 3), 2: stepAt(tones[2], 2, 2) }),
      ring('Broken Chord Wave', 'marimba', 'melody', 4, Object.fromEntries(arp.map((m, i) => [i, fromMidi(m, i === 0 ? 3 : 2)])))
    ];
  }
  return withRoles(cloneRings(item.rings || []));
}

function refreshChordLab() {
  state.referenceRings = buildChordLabRings(currentItem());
  if (!state.userEdited) state.userRings = cloneRings(state.referenceRings);
  audio.unlock();
  state.referenceRings.forEach(r => { if (r.steps[0] && r.steps[0].active) audio.audition(r.steps[0], r.instrument, ringVoicing(r)[0]); });
  renderDrawerContent(); renderDock(); bump();
}

function applyColorLab() {
  const pc = state.colorLabPC, oct = state.colorLabOct;
  audio.unlock();
  audio.audition({ active: true, pitchClass: pc, octave: oct, accent: 3, chord: 'single' }, oct <= 2 ? 'sub_bass' : oct === 3 ? 'grand_piano' : 'marimba');
  state.referenceRings = withRoles([
    { name: 'Low Octave (2)', instrument: 'sub_bass', steps: makeSteps(4, { 0: { pc, oct: 2, acc: 3 } }) },
    { name: 'Mid Octave (3)', instrument: 'grand_piano', steps: makeSteps(4, { 1: { pc, oct: 3, acc: 3 } }) },
    { name: 'High Octaves (4–5)', instrument: 'marimba', steps: makeSteps(4, { 2: { pc, oct: 4, acc: 3 }, 3: { pc, oct: 5, acc: 3 } }) }
  ]);
  if (!state.userEdited) state.userRings = cloneRings(state.referenceRings);
  bump();
}


// ---------- Ring dock: built on structural change only; values/classes updated in place (AR-09) ----------
function renderDock() {
  const dock = $('bottomRingDock');
  const mode = $('dock').dataset.mode;
  if (mode === 'none') { dock.innerHTML = ''; return; }
  const full = mode === 'edit';
  const rings = getActiveRings();
  // Phones: one ring at a time. A row of ring tabs picks which ring's controls show, so nothing scrolls sideways.
  const phone = isMobile();
  if (phone) state.dockRing = Math.max(0, Math.min(rings.length - 1, state.dockRing || 0));
  const tabs = phone ? `<div class="ring-tabs" role="tablist" aria-label="Choose a ring">${rings.map((ring, r) => {
    const role = ring.role || defaultRole(r, rings.length, ring.instrument);
    return `<button role="tab" data-ring="${r}" aria-selected="${r === state.dockRing}" class="ring-tab${r === state.dockRing ? ' on' : ''}${isAudible(r) ? '' : ' muted'}"><span class="w-2 h-2 rounded-full ${ROLE_COLOR[role] || 'bg-white/50'} shrink-0"></span><span class="truncate">${esc(ring.name)}</span></button>`;
  }).join('')}</div>` : '';
  dock.classList.toggle('dock-phone', phone);
  dock.innerHTML = tabs + rings.map((ring, r) => {
    if (phone && r !== state.dockRing) return '';
    const role = ring.role || defaultRole(r, rings.length, ring.instrument);
    const steps = [...new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 24, 32, ring.steps.length])].sort((a, b) => a - b);
    return `<div class="dock-card flex items-center gap-2 px-2.5 py-1.5 rounded-xl border" data-r="${r}">
      <div class="flex items-center gap-1.5 dock-name">
        <span class="w-2 h-2 rounded-full ${ROLE_COLOR[role] || 'bg-white/50'} shrink-0"></span>
        <div class="leading-tight min-w-0">
          <div class="text-[13px] font-semibold text-white dock-title">${esc(ring.name)}</div>
          <div class="text-[13px] text-white/45">${ROLE_LABEL[role] || ''}</div>
        </div>
      </div>
      ${full ? `
      <select data-act="inst" class="editorial-select bg-black/40 border border-white/10 rounded-lg px-2 h-8 text-[13px] text-white/90 focus:outline-none cursor-pointer" aria-label="Instrument for ${esc(ring.name)}">
        ${INSTRUMENTS.map(i => `<option value="${i.id}" ${ring.instrument === i.id ? 'selected' : ''}>${i.label}</option>`).join('')}
      </select>
      <label class="flex items-center bg-black/35 border border-white/10 rounded-lg px-1.5 h-8 gap-1" title="Steps (subdivisions) in this ring">
        <span class="text-[13px] text-white/50">Steps</span>
        <select data-act="steps" class="bg-transparent text-[13px] font-semibold text-white focus:outline-none cursor-pointer">
          ${steps.map(n => `<option value="${n}" ${ring.steps.length === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </label>
      <div class="flex items-center gap-1">
        <button data-act="ccw" class="rams-btn w-8 h-8 rounded-md text-[13px] text-white/80" title="Rotate one step back" aria-label="Rotate back">↺</button>
        <button data-act="cw" class="rams-btn w-8 h-8 rounded-md text-[13px] text-white/80" title="Rotate one step forward" aria-label="Rotate forward">↻</button>
        <button data-act="octd" class="rams-btn px-1.5 h-8 rounded-md text-[13px] text-white/75" title="Down one octave">−Oct</button>
        <button data-act="octu" class="rams-btn px-1.5 h-8 rounded-md text-[13px] text-white/75" title="Up one octave">+Oct</button>
      </div>` : ''}
      <div class="flex items-center gap-1 ${full ? 'pl-1 border-l border-white/10' : ''}">
        <button data-act="mute" class="mix-btn w-8 h-8 rounded-md text-[13px] font-bold" title="Mute" aria-label="Mute ${esc(ring.name)}">M</button>
        <button data-act="solo" class="mix-btn w-8 h-8 rounded-md text-[13px] font-bold" title="Solo" aria-label="Solo ${esc(ring.name)}">S</button>
        ${full ? `<button data-act="clear" class="rams-btn px-2 h-8 rounded-md text-[13px] text-white/60" title="Clear every note on this ring">Clear</button>` : ''}
      </div>
    </div>`;
  }).join('');
  updateMixUI();
  $('ringAddRemove').classList.toggle('hidden', !full);
  $('dockTools').classList.toggle('hidden', !full);
}
function updateMixUI() {
  $('bottomRingDock').querySelectorAll('.ring-tab').forEach(t => t.classList.toggle('muted', !isAudible(Number(t.dataset.ring))));
  $('bottomRingDock').querySelectorAll('.dock-card').forEach(card => {
    const r = Number(card.dataset.r), audible = isAudible(r);
    card.classList.toggle('muted', !audible);
    const m = card.querySelector('[data-act="mute"]'), s = card.querySelector('[data-act="solo"]');
    m.classList.toggle('mute-on', state.mix.muted[r]); m.setAttribute('aria-pressed', String(state.mix.muted[r]));
    s.classList.toggle('solo-on', state.mix.solo[r]); s.setAttribute('aria-pressed', String(state.mix.solo[r]));
  });
}
function updateDockValues() {
  const rings = getActiveRings();
  $('bottomRingDock').querySelectorAll('.dock-card').forEach(card => {
    const ring = rings[Number(card.dataset.r)];
    if (!ring) return;
    const i = card.querySelector('[data-act="inst"]'); if (i) i.value = ring.instrument;
  });
}
const dockEl = $('bottomRingDock');
dockEl.addEventListener('click', e => {
  const t = e.target.closest('button[data-ring]');
  if (t) { state.dockRing = Number(t.dataset.ring); renderDock(); return; }
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const r = Number(b.closest('.dock-card').dataset.r), act = b.dataset.act;
  if (act === 'mute' || act === 'solo') {
    const m = state.mix;
    if (act === 'mute') { m.muted[r] = !m.muted[r]; if (m.muted[r]) m.solo[r] = false; }
    else { m.solo[r] = !m.solo[r]; if (m.solo[r]) m.muted[r] = false; }
    updateMixUI(); renderer.invalidate(); requestDraw();
    return;
  }
  const ops = {
    ccw: rs => rs[r].steps.push(rs[r].steps.shift()),
    cw: rs => rs[r].steps.unshift(rs[r].steps.pop()),
    octd: rs => rs[r].steps.forEach(s => { if (s.active) s.octave = Math.max(1, s.octave - 1); }),
    octu: rs => rs[r].steps.forEach(s => { if (s.active) s.octave = Math.min(6, s.octave + 1); }),
    clear: rs => rs[r].steps.forEach(s => { s.active = false; })
  };
  if (ops[act]) { edit(ops[act]); if (act === 'clear') closeDotPopover(); }
});
dockEl.addEventListener('change', e => {
  const sel = e.target.closest('select[data-act]'); if (!sel) return;
  const r = Number(sel.closest('.dock-card').dataset.r);
  if (sel.dataset.act === 'inst') edit(rs => {
    rs[r].instrument = sel.value;
    const first = rs[r].steps.find(s => s.active);
    audio.unlock();
    if (first) audio.audition(first, rs[r].instrument);
  });
  if (sel.dataset.act === 'steps') edit(rs => resizeRing(rs[r], Number(sel.value)), { structural: true });
});

function resizeRing(ring, n) {
  const old = ring.steps, oct = ring.role === 'bass' ? 2 : ring.role === 'harmony' ? 3 : 4;
  ring.steps = Array.from({ length: n }, (_, i) => (i < old.length ? { ...old[i] } : { active: false, pitchClass: 0, octave: oct, accent: 2, chord: 'single' }));
}

// ---------- Drawer ----------
function renderDrawerContent() {
  const item = currentItem(), scene = currentScene(item);
  $('lessonEyebrow').textContent = item.eyebrow || '';
  $('lessonTitle').textContent = item.title;
  $('lessonHook').textContent = scene ? scene.hook : item.hook;
  $('tryPromptText').textContent = item.tryPrompt;
  $('behindSoundText').textContent = item.behindSound;
  $('behindSoundSource').textContent = `Source: ${item.source}`;

  const lab = $('interactiveLabContainer');
  lab.innerHTML = '';
  const panel = cls => { const d = document.createElement('div'); d.className = cls; lab.appendChild(d); return d; };
  ['nowPlayingBox', 'tryBox', 'whyBox'].forEach(id => $(id).classList.toggle('hidden', !!item.isCreate));
  if (item.isCreate) { renderCreatePanel(panel('space-y-3')); return; }

  if (item.labType === 'sceneFlip' && item.scenes) {
    const wrap = panel('space-y-1.5');
    wrap.innerHTML = `<span class="eyebrow text-white/50 block">Compare</span>
      <div class="grid ${['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'][item.scenes.length] || 'grid-cols-2'} gap-1 p-1 rounded-xl bg-black/35 border border-white/10">
      ${item.scenes.map((sc, i) => `<button data-scene="${i}" class="seg-btn ${i === state.activeSceneIndex ? 'on' : ''}">${esc(sc.label)}</button>`).join('')}</div>`;
    wrap.querySelectorAll('[data-scene]').forEach(b => b.onclick = () => { state.activeSceneIndex = Number(b.dataset.scene); loadItem(item.id, true); });
  }
  // Phones: the same switch sits above the wheel, so comparing never needs the bottom sheet.
  const ss = $('stageScenes');
  if (item.labType === 'sceneFlip' && item.scenes) {
    ss.innerHTML = item.scenes.map((sc, i) => `<button data-scene="${i}" class="seg-btn ${i === state.activeSceneIndex ? 'on' : ''}">${esc(sc.label)}</button>`).join('');
    ss.querySelectorAll('[data-scene]').forEach(b => b.onclick = () => { state.activeSceneIndex = Number(b.dataset.scene); loadItem(item.id, true); });
    ss.classList.remove('hidden');
  } else { ss.innerHTML = ''; ss.classList.add('hidden'); }

  if (item.labType === 'colorLab') {
    const wrap = panel('p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2');
    wrap.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="eyebrow text-white/50">12 notes, 12 colours</span>
        <span class="text-[13px] font-semibold text-amber-300">${formatNoteName(state.colorLabPC, state.colorLabOct)} · ${hueName(state.colorLabPC)}</span>
      </div>
      <div class="sw grid grid-cols-6 gap-1"></div>
      <div><span class="eyebrow text-white/50 block mb-1">Octave</span>
      <div class="oc grid grid-cols-6 gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10"></div></div>`;
    for (let pc = 0; pc < 12; pc++) {
      const b = document.createElement('button');
      b.className = `h-8 rounded-md text-[13px] font-bold text-neutral-950/85 cursor-pointer ${pc === state.colorLabPC ? 'ring-2 ring-white' : 'opacity-90'}`;
      b.style.backgroundColor = colorOf(pc, state.colorLabOct);
      b.textContent = NOTE_NAMES[pc];
      b.setAttribute('aria-label', `${NOTE_NAMES[pc]} (${hueName(pc)})`);
      b.onclick = () => { state.colorLabPC = pc; applyColorLab(); renderDrawerContent(); renderDock(); };
      wrap.querySelector('.sw').appendChild(b);
    }
    [1, 2, 3, 4, 5, 6].forEach(oct => {
      const b = document.createElement('button');
      b.className = `seg-btn ${oct === state.colorLabOct ? 'on-soft' : ''}`;
      b.textContent = String(oct);
      b.onclick = () => { state.colorLabOct = oct; applyColorLab(); renderDrawerContent(); renderDock(); };
      wrap.querySelector('.oc').appendChild(b);
    });
  }

  if (item.labType === 'chordLab') {
    const wrap = panel('p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2');
    const roots = [0, 2, 4, 5, 7, 9, 11];
    const btn = (attr, val, label, on, cls) => `<button ${attr}="${val}" class="seg-btn ${on ? cls : ''}">${label}</button>`;
    let html = `<div class="flex items-center justify-between"><span class="eyebrow text-white/50">Chord lab</span>
      <span class="text-[13px] font-semibold text-amber-300">${NOTE_NAMES[state.chordLabRoot]} ${item.chordLabMode === 'compareQualities' ? 'triads' : CHORD_LABELS[state.chordLabQuality]}</span></div>`;
    html += `<div class="grid grid-cols-7 gap-1">${roots.map(pc => btn('data-root', pc, NOTE_NAMES[pc], state.chordLabRoot === pc, 'on')).join('')}</div>`;
    if (item.chordLabMode !== 'compareQualities') {
      html += `<div class="grid grid-cols-5 gap-1">${['major', 'minor', 'dom7', 'm7', 'maj7'].map(q => btn('data-qual', q, CHORD_LABELS[q], state.chordLabQuality === q, 'on-soft')).join('')}</div>`;
    }
    const modes = item.chordLabMode === 'inversions'
      ? [['root', 'Root'], ['inv1', '1st inv'], ['inv2', '2nd inv'], ...(CHORDS[state.chordLabQuality].length > 3 ? [['inv3', '3rd inv']] : [])]
      : item.chordLabMode === 'orchestral' ? [['close', 'Close'], ['open', 'Open']]
        : item.chordLabMode === 'arpeggio' ? [['block', 'Block chord'], ['arpeggio', 'Arpeggio']] : [];
    if (modes.length) html += `<div class="grid ${['', '', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'][modes.length]} gap-1">${modes.map(([id, l]) => btn('data-voice', id, l, state.chordLabVoicing === id, 'on-cyan')).join('')}</div>`;
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-root]').forEach(b => b.onclick = () => { state.chordLabRoot = Number(b.dataset.root); refreshChordLab(); });
    wrap.querySelectorAll('[data-qual]').forEach(b => b.onclick = () => {
      state.chordLabQuality = b.dataset.qual;
      if (state.chordLabVoicing === 'inv3' && CHORDS[b.dataset.qual].length < 4) state.chordLabVoicing = 'inv2';
      refreshChordLab();
    });
    wrap.querySelectorAll('[data-voice]').forEach(b => b.onclick = () => { state.chordLabVoicing = b.dataset.voice; refreshChordLab(); });
  }

  if (item.labType === 'rotationLab') {
    const which = item.rotateRings;
    const wrap = panel('p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5');
    wrap.innerHTML = `<span class="eyebrow text-white/50 block">${which ? 'Rotate the clave' : 'Rotate the inner rings'}</span>
      <div class="grid grid-cols-2 gap-1.5">
        <button class="ccw rams-btn h-9 rounded-lg text-[13px] font-medium text-white">↺ Back one step</button>
        <button class="cw rams-btn h-9 rounded-lg text-[13px] font-medium text-white">↻ Forward one step</button>
        ${which ? '<button class="half rams-btn h-9 rounded-lg text-[13px] font-medium text-white col-span-2">⇅ Half a turn: 3-2 ↔ 2-3 clave</button>' : ''}
      </div>`;
    const rot = (dir, times = 1) => edit(rs => rs.forEach((ring, i) => {
      if (which ? !which.includes(i) : rs.length > 1 && i === 0) return;
      for (let k = 0; k < times; k++) dir > 0 ? ring.steps.unshift(ring.steps.pop()) : ring.steps.push(ring.steps.shift());
    }));
    wrap.querySelector('.ccw').onclick = () => rot(-1);
    wrap.querySelector('.cw').onclick = () => rot(1);
    const half = wrap.querySelector('.half');
    if (half) half.onclick = () => rot(1, Math.round(state.userRings[which[0]].steps.length / 2));
  }

  if (item.sargam) {
    const wrap = panel('p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5');
    wrap.innerHTML = `<div class="flex items-center justify-between"><span class="eyebrow text-white/50">Note names</span><span class="text-[13px] text-white/55">Sa = ${NOTE_NAMES[item.tonic || 0]}</span></div>
      <div class="grid grid-cols-2 gap-1"><button data-sg="off" class="seg-btn ${settings.sargam !== 'on' ? 'on' : ''}">Western (C D E)</button><button data-sg="on" class="seg-btn ${settings.sargam === 'on' ? 'on' : ''}">Sargam (Sa Re Ga)</button></div>
      <p class="text-[13px] text-white/55 leading-snug">On the tabla ring the dots show the bols. X = sam, 0 = khali (wave), numbers = claps.</p>`;
    wrap.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => { settings.sargam = b.dataset.sg; saveSettings(); renderer.invalidate(); requestDraw(); renderDrawerContent(); });
  }

  if (item.labType === 'sceneFlip' && item.scenes && item.scenes.length > 1) {
    const b = document.createElement('button');
    b.className = 'rams-btn w-full h-9 rounded-lg text-[13px] font-medium text-white/90';
    b.textContent = 'Ear check: can you tell them apart?';
    b.onclick = () => startEarCheck();
    lab.appendChild(b);
  }
}

// ---------- Create mode: templates, brush, Random Groove (POST-06/07/08) ----------
const BRUSH_CHORDS = ['single', 'major', 'minor', 'dom7', 'm7', 'maj7', 'sus4', 'add9'];
const ACCENTS = [[3, 'High'], [2, 'Mid'], [1, 'Soft']];
function brushLabel() {
  const b = state.brush;
  return `${NOTE_NAMES[b.pc]}${b.oct === 'auto' ? '' : b.oct}${b.chord !== 'single' ? ' ' + CHORD_LABELS[b.chord] : ''} · ${ACCENTS.find(a => a[0] === b.acc)[1]}`;
}
function renderCreatePanel(wrap) {
  const b = state.brush;
  const templates = CURRICULUM.filter(i => i.isCreate);
  wrap.innerHTML = `
    <div class="space-y-1.5">
      <span class="eyebrow text-white/50 block">Start from</span>
      <div class="grid grid-cols-2 gap-1">${templates.map(t => `<button data-tpl="${t.id}" class="seg-btn ${t.id === state.currentItemId ? 'on' : ''}">${esc(t.short)}</button>`).join('')}</div>
    </div>
    <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
      <div class="flex items-center justify-between"><span class="eyebrow text-white/50">Brush</span><span class="text-[13px] font-semibold text-amber-300">${esc(brushLabel())}</span></div>
      <div class="grid grid-cols-6 gap-1">${NOTE_NAMES.map((n, pc) => `<button data-bpc="${pc}" class="h-8 rounded-md text-[13px] font-bold text-neutral-950/85 cursor-pointer ${pc === b.pc ? 'ring-2 ring-white' : 'opacity-90'}" style="background:${colorOf(pc, b.oct === 'auto' ? 4 : b.oct)}" aria-label="${n}">${n}</button>`).join('')}</div>
      <div><span class="text-[13px] text-white/55 block mb-1">Octave</span>
        <div class="grid grid-cols-5 gap-1">${['auto', 2, 3, 4, 5].map(o => `<button data-boct="${o}" class="seg-btn ${b.oct === o ? 'on-soft' : ''}" title="${o === 'auto' ? 'Bass low, chords middle, melody high' : ''}">${o === 'auto' ? 'Auto' : o}</button>`).join('')}</div></div>
      <div><span class="text-[13px] text-white/55 block mb-1">Note or chord</span>
        <div class="grid grid-cols-4 gap-1">${BRUSH_CHORDS.map(c => `<button data-bch="${c}" class="seg-btn ${b.chord === c ? 'on-soft' : ''}">${c === 'single' ? 'Note' : CHORD_LABELS[c]}</button>`).join('')}</div></div>
      <div><span class="text-[13px] text-white/55 block mb-1">Accent</span>
        <div class="grid grid-cols-3 gap-1">${ACCENTS.map(([v, l]) => `<button data-bacc="${v}" class="seg-btn ${b.acc === v ? 'on-soft' : ''}">${l}</button>`).join('')}</div></div>
      <div><span class="text-[13px] text-white/55 block mb-1">On drum rings</span>
        <div class="grid grid-cols-5 gap-1">${['kick', 'snare', 'hat', 'clap', 'stomp'].map(d => `<button data-bdr="${d}" class="seg-btn ${b.drum === d ? 'on-soft' : ''}">${d}</button>`).join('')}</div></div>
    </div>
    <p class="text-[13px] text-white/60 leading-relaxed">Click an empty step to paint it with the brush. Click a note to erase it. Long-press or right-click a note to fine-tune it.</p>
    <div class="grid grid-cols-3 gap-1.5">
      <button id="randomGrooveBtn" class="h-9 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 text-[13px] font-semibold cursor-pointer">✦ Random Groove</button>
      <button id="createUndoBtn" class="rams-btn h-9 rounded-lg text-[13px] text-white/85">Undo</button>
      <button id="clearAllBtn" class="rams-btn h-9 rounded-lg text-[13px] text-white/85">Clear All</button>
    </div>
    <button id="showRingControlsBtn" class="rams-btn w-full h-9 rounded-lg text-[13px] text-white/85 md:hidden">Ring controls (instruments, steps, rings)</button>`;
  wrap.querySelectorAll('[data-tpl]').forEach(x => x.onclick = () => loadItem(x.dataset.tpl));
  const set = (k, v, sound = true) => {
    state.brush[k] = v; renderDrawerContent();
    if (sound) { audio.unlock(); audio.audition({ active: true, pitchClass: state.brush.pc, octave: state.brush.oct === 'auto' ? 4 : state.brush.oct, accent: state.brush.acc, chord: state.brush.chord }, 'grand_piano'); }
  };
  wrap.querySelectorAll('[data-bpc]').forEach(x => x.onclick = () => set('pc', Number(x.dataset.bpc)));
  wrap.querySelectorAll('[data-boct]').forEach(x => x.onclick = () => set('oct', x.dataset.boct === 'auto' ? 'auto' : Number(x.dataset.boct)));
  wrap.querySelectorAll('[data-bch]').forEach(x => x.onclick = () => set('chord', x.dataset.bch));
  wrap.querySelectorAll('[data-bacc]').forEach(x => x.onclick = () => set('acc', Number(x.dataset.bacc)));
  wrap.querySelectorAll('[data-bdr]').forEach(x => x.onclick = () => {
    state.brush.drum = x.dataset.bdr; renderDrawerContent();
    audio.unlock(); audio.audition({ active: true, pitchClass: 0, octave: 3, accent: 3, chord: 'single', drum: x.dataset.bdr }, 'percussion');
  });
  $('randomGrooveBtn').onclick = () => {
    let label = '';
    edit(rs => { const g = randomGroove(rs, state.beats); label = g.label; rs.splice(0, rs.length, ...g.rings); }, { structural: true });
    showToast(`Random groove in ${label}. Undo to go back, or press again for another.`);
    if (!state.isPlaying) startPlayback();
    track('random-groove');
  };
  $('createUndoBtn').onclick = undo;
  $('createUndoBtn').disabled = !state.undo.length;
  $('clearAllBtn').onclick = () => {
    edit(rs => rs.forEach(r => r.steps.forEach(st => { st.active = false; })));
    closeDotPopover();
    showToast('Cleared. Undo brings it back.');
  };
  $('showRingControlsBtn').onclick = () => { state.createDock = true; setDrawerOpen(false); refreshModeUI(); };
}

/** Paint a step with the brush (Create mode). */
function paintStep(ring, s, idx) {
  const b = state.brush;
  s.active = true;
  s.accent = b.acc;
  delete s.len;
  if (ring.instrument === 'percussion') {
    s.drum = b.drum; s.chord = 'single'; s.octave = 3;
    s.pitchClass = { kick: 0, stomp: 0, snare: 4, clap: 5, hat: 9, dha: 0, dhin: 0, ge: 0, na: 9, tin: 9, ke: 4 }[b.drum] ?? 0;
    return;
  }
  s.pitchClass = b.pc;
  s.octave = b.oct === 'auto' ? (ring.role === 'bass' ? 2 : ring.role === 'harmony' ? 3 : 4) : b.oct;
  s.chord = b.chord;
}

// ---------- Canvas input: Pointer Events (LT-14), click toggles (LT-03) ----------
const tooltip = $('dotHoverTooltip');
let press = null, tempoDrag = false, hintShown = !!store.get('concentric-hint-dot');
const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

canvas.addEventListener('pointerdown', e => {
  audio.unlock();
  const [x, y] = local(e);
  if (renderer.nearTempoArc(x, y)) {
    tempoDrag = true; dragging = true;
    canvas.setPointerCapture(e.pointerId);
    setBpm(renderer.tempoFromPoint(x, y));
    return;
  }
  if (renderer.inHeart(x, y)) { tapTempo(); return; }
  if (mystery.mode) return;
  const hit = renderer.hit(x, y, e.pointerType !== 'mouse');
  if (!hit) { closeDotPopover(); return; }
  if (e.button === 2 || e.altKey || e.ctrlKey || e.metaKey) { openDotPopover(hit.r, hit.s, e.clientX, e.clientY); return; }
  press = { hit, x, y, cx: e.clientX, cy: e.clientY, long: false };
  press.timer = setTimeout(() => { if (press) { press.long = true; haptic(12); openDotPopover(hit.r, hit.s, press.cx, press.cy); } }, 480);
});
canvas.addEventListener('pointermove', e => {
  const [x, y] = local(e);
  if (tempoDrag) { setBpm(renderer.tempoFromPoint(x, y)); return; }
  if (press && Math.hypot(x - press.x, y - press.y) > 10) { clearTimeout(press.timer); press = null; }
  if (e.pointerType === 'mouse') hover(x, y, e.clientX, e.clientY);
});
const endPress = () => {
  if (tempoDrag) { tempoDrag = false; dragging = false; return; }
  if (!press) return;
  clearTimeout(press.timer);
  const p = press; press = null;
  if (!p.long) toggleDot(p.hit.r, p.hit.s);
};
canvas.addEventListener('pointerup', endPress);
canvas.addEventListener('pointercancel', () => { if (press) clearTimeout(press.timer); press = null; tempoDrag = false; dragging = false; });
canvas.addEventListener('pointerleave', () => { state.hovered = null; tooltip.classList.add('hidden'); requestDraw(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  const [x, y] = local(e);
  const hit = renderer.hit(x, y, false);
  if (!hit || isLocked() || mystery.mode) return;
  e.preventDefault();
  edit(rs => {
    const step = rs[hit.r].steps[hit.s];
    step.active = true;
    const total = step.octave * 12 + step.pitchClass + (e.deltaY < 0 ? 1 : -1);
    step.octave = Math.max(1, Math.min(6, Math.floor(total / 12)));
    step.pitchClass = pcOf(total);
    audio.audition(step, rs[hit.r].instrument);
  });
  if (state.editing && state.editing.r === hit.r && state.editing.s === hit.s) updatePopoverUI();
}, { passive: false });

function describeDot(r, s) {
  const rings = getActiveRings(), ring = rings[r], step = ring && ring.steps[s];
  if (!step) return '';
  const role = ROLE_LABEL[ring.role] || '';
  const where = `${role} ring, step ${s + 1} of ${ring.steps.length}`;
  if (!step.active) return `${where}: rest`;
  const what = ring.instrument === 'percussion' ? (step.drum || 'drum')
    : `${noteName(step.pitchClass, step.octave)}${step.chord && step.chord !== 'single' ? ' ' + CHORD_LABELS[step.chord] + ' chord' : ''}`;
  return `${where}: ${what}, ${step.accent === 3 ? 'accent' : step.accent === 2 ? 'medium' : 'ghost note'}`;
}

function hover(x, y, clientX, clientY) {
  const hit = renderer.hit(x, y, false);
  const prev = state.hovered;
  state.hovered = hit ? { r: hit.r, s: hit.s } : null;
  if (!prev !== !hit || (prev && hit && (prev.r !== hit.r || prev.s !== hit.s))) requestDraw();
  if (!hit) { tooltip.classList.add('hidden'); return; }
  const rings = getActiveRings(), ring = rings[hit.r], step = ring.steps[hit.s];
  tooltip.classList.remove('hidden');
  tooltip.style.left = `${Math.min(window.innerWidth - 240, clientX + 14)}px`;
  tooltip.style.top = `${Math.max(64, clientY - 30)}px`;
  const role = ROLE_LABEL[ring.role] || '';
  if (step.active) {
    $('tooltipSwatch').style.backgroundColor = colorOf(step.pitchClass, step.octave);
    const chord = step.chord && step.chord !== 'single' ? ` ${CHORD_LABELS[step.chord]}` : '';
    $('tooltipNote').textContent = ring.instrument === 'percussion' ? (step.drum || 'drum') : `${noteName(step.pitchClass, step.octave)}${chord}`;
    $('tooltipRole').textContent = `${role} · ${step.accent === 3 ? 'Accent' : step.accent === 2 ? 'Medium' : 'Ghost'}`;
  } else {
    $('tooltipSwatch').style.backgroundColor = 'rgba(255,255,255,0.25)';
    $('tooltipNote').textContent = 'Rest';
    $('tooltipRole').textContent = `${role} · click to add a note`;
  }
}

function toggleDot(r, s) {
  if (isLocked()) { lockedToast(); return; }
  if (isMobile() && state.dockRing !== r) { state.dockRing = r; setTimeout(renderDock, 0); }
  edit(rs => {
    const ring = rs[r], step = ring.steps[s];
    if (step.active) { step.active = false; return; }
    if (isCreate()) { paintStep(ring, step, s); audio.audition(step, ring.instrument); return; }
    step.active = true;
    step.octave = ring.role === 'bass' ? 2 : ring.role === 'harmony' ? 3 : 4;
    step.pitchClass = 0; step.chord = 'single'; delete step.len;
    step.accent = s === 0 ? 3 : 2;
    if (ring.instrument === 'percussion') step.drum = 'kick';
    audio.audition(step, ring.instrument);
  });
  haptic(8);
  if (state.editing) updatePopoverUI();
  if (state.focus) announce(describeDot(r, s));
  if (!hintShown) { hintShown = true; store.set('concentric-hint-dot', '1'); showToast('Tip: long-press or right-click a dot to change its note.', 3600); }
}

// Keyboard: arrow keys move around the wheel, Enter toggles, E opens the editor (DR-06)
canvas.addEventListener('focus', () => {
  if (!state.focus) state.focus = { r: getActiveRings().length - 1, s: 0 };
  announce(describeDot(state.focus.r, state.focus.s));
  requestDraw();
});
canvas.addEventListener('blur', () => { state.focus = null; requestDraw(); });
canvas.addEventListener('keydown', e => {
  if (!state.focus) return;
  const rings = getActiveRings();
  let { r, s } = state.focus;
  const n = () => rings[r].steps.length;
  if (e.key === 'ArrowRight') s = (s + 1) % n();
  else if (e.key === 'ArrowLeft') s = (s - 1 + n()) % n();
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const frac = s / n();
    r = Math.max(0, Math.min(rings.length - 1, r + (e.key === 'ArrowUp' ? -1 : 1)));
    s = Math.round(frac * rings[r].steps.length) % rings[r].steps.length;
  } else if (e.key === 'Enter') { e.preventDefault(); toggleDot(r, s); return; }
  else if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    const d = renderer.dots.find(d => d.r === r && d.s === s), rect = canvas.getBoundingClientRect();
    if (d) openDotPopover(r, s, rect.left + d.x, rect.top + d.y);
    return;
  } else return;
  e.preventDefault();
  state.focus = { r, s };
  announce(describeDot(r, s));
  requestDraw();
});

let taps = [];
function tapTempo() {
  const now = performance.now();
  taps = taps.filter(t => now - t < 2500); taps.push(now);
  if (taps.length >= 2) {
    const d = taps.slice(1).map((t, i) => t - taps[i]);
    setBpm(60000 / (d.reduce((a, b) => a + b, 0) / d.length));
  }
  audio.tick();
}

// ---------- Note editor popover ----------
const LENGTHS = [['auto', 'Auto'], [1, '1'], [2, '2'], [4, '4'], [8, '8']];
function openDotPopover(r, s, x, y) {
  if (isLocked()) { lockedToast(); return; }
  if (!state.tryMode) enterEditMode();
  if (state.peekHolding) peek(false);
  if (!state.userRings[r].steps[s].active) edit(rs => {
    const st = rs[r].steps[s]; st.active = true;
    st.octave = rs[r].role === 'bass' ? 2 : rs[r].role === 'harmony' ? 3 : 4;
  });
  state.editing = { r, s };
  const pop = $('dotEditorPopover');
  pop.classList.remove('hidden');
  const ph = pop.offsetHeight || 420, pw = pop.offsetWidth || 300;
  pop.style.left = `${Math.max(8, Math.min(window.innerWidth - pw - 8, x + 16))}px`;
  pop.style.top = `${Math.max(60, Math.min(window.innerHeight - ph - 8, y - 40))}px`;
  updatePopoverUI();
  requestDraw();
}
function closeDotPopover() {
  state.editing = null;
  $('dotEditorPopover').classList.add('hidden');
  requestDraw();
}
function editStep(fn) {
  if (!state.editing) return;
  const { r, s } = state.editing;
  edit(rs => { fn(rs[r].steps[s], rs[r]); audio.audition(rs[r].steps[s], rs[r].instrument); });
  updatePopoverUI();
}
function updatePopoverUI() {
  if (!state.editing) return;
  const { r, s } = state.editing;
  const ring = state.userRings[r], step = ring.steps[s];
  const drum = ring.instrument === 'percussion';
  $('popoverRingLabel').textContent = `${ROLE_LABEL[ring.role] || ''} · ${ring.name}`;
  $('popoverStepLabel').textContent = `Step ${s + 1} · ${drum ? (step.drum || 'kick') : noteName(step.pitchClass, step.octave)}`;
  $('popoverColorHex').textContent = drum ? '' : `${hueName(step.pitchClass)} · ${hueOf(step.pitchClass)}°`;

  const grid = $('popoverPitchGrid');
  grid.innerHTML = '';
  if (drum) {
    const tabla = ring.kit === 'tabla' || TABLA_VOICES.some(v => (step.drum || '').split('+').includes(v));
    (tabla ? TABLA_VOICES : KIT_VOICES).forEach(d => {
      const on = (step.drum || 'kick').split('+').includes(d);
      const b = document.createElement('button');
      b.className = `h-8 col-span-2 rounded-md text-[13px] font-semibold cursor-pointer ${on ? 'bg-amber-400 text-neutral-950' : 'bg-white/[0.06] text-white/75'}`;
      b.textContent = d;
      b.setAttribute('aria-pressed', String(on));
      b.onclick = () => editStep(st => {
        const set = new Set((st.drum || 'kick').split('+'));
        set.has(d) && set.size > 1 ? set.delete(d) : set.add(d);
        st.drum = [...set].join('+');
      });
      grid.appendChild(b);
    });
  } else {
    for (let pc = 0; pc < 12; pc++) {
      const b = document.createElement('button');
      b.className = `h-8 rounded-md text-[13px] font-bold text-neutral-950/85 cursor-pointer ${step.pitchClass === pc ? 'ring-2 ring-white' : 'opacity-90'}`;
      b.style.backgroundColor = colorOf(pc, step.octave);
      b.textContent = NOTE_NAMES[pc];
      b.setAttribute('aria-label', `${NOTE_NAMES[pc]} (${hueName(pc)})`);
      b.onclick = () => editStep(st => { st.pitchClass = pc; });
      grid.appendChild(b);
    }
  }
  document.querySelectorAll('.pop-oct-btn').forEach(b => b.classList.toggle('on', Number(b.dataset.oct) === step.octave));
  const cg = $('popoverChordGrid');
  cg.innerHTML = '';
  Object.keys(CHORDS).forEach(ch => {
    const b = document.createElement('button');
    b.className = `seg-btn ${(step.chord || 'single') === ch ? 'on' : ''}`;
    b.textContent = CHORD_LABELS[ch];
    b.disabled = drum;
    b.onclick = () => editStep(st => { st.chord = ch; });
    cg.appendChild(b);
  });
  const lg = $('popoverLenGrid');
  lg.innerHTML = '';
  LENGTHS.forEach(([v, l]) => {
    const b = document.createElement('button');
    b.className = `seg-btn ${(v === 'auto' ? !step.len : step.len === v) ? 'on-soft' : ''}`;
    b.textContent = l;
    b.onclick = () => editStep(st => { if (v === 'auto') delete st.len; else st.len = v; });
    lg.appendChild(b);
  });
  document.querySelectorAll('.pop-acc-btn').forEach(b => b.classList.toggle('on', Number(b.dataset.accent) === step.accent));
}
document.querySelectorAll('.pop-oct-btn').forEach(b => b.onclick = () => editStep(st => { st.octave = Number(b.dataset.oct); }));
document.querySelectorAll('.pop-acc-btn').forEach(b => b.onclick = () => editStep(st => { st.accent = Number(b.dataset.accent); }));
$('removeDotBtn').onclick = () => { if (!state.editing) return; const { r, s } = state.editing; edit(rs => { rs[r].steps[s].active = false; }); closeDotPopover(); };
$('closePopoverBtn').onclick = closeDotPopover;

// ---------- Import validation (LT-02) ----------
function sanitizePreset(data) {
  if (!data || !Array.isArray(data.rings) || !data.rings.length) throw new Error('no rings');
  const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const rings = data.rings.slice(0, 5).map((r, i, all) => {
    const instrument = INST[r && r.instrument] ? r.instrument : 'marimba';
    const steps = (Array.isArray(r && r.steps) ? r.steps : []).slice(0, 128).map(s => {
      const o = {
        active: !!(s && s.active), pitchClass: int(s && s.pitchClass, 0, 11, 0), octave: int(s && s.octave, 1, 6, 4),
        accent: int(s && s.accent, 1, 3, 2), chord: CHORDS[s && s.chord] ? s.chord : 'single'
      };
      if (s && s.len) o.len = int(s.len, 1, 128, 1);
      if (s && typeof s.drum === 'string') { const d = s.drum.split('+').filter(x => DRUM_VOICES.includes(x)); if (d.length) o.drum = d.join('+'); }
      return o;
    });
    if (!steps.length) steps.push(...makeSteps(4));
    const role = ['bass', 'harmony', 'melody', 'percussion'].includes(r && r.role) ? r.role : defaultRole(i, all.length, instrument);
    const out = { name: String((r && r.name) || `Layer ${i + 1}`).slice(0, 40), instrument, role, steps };
    if (r && r.voiceLead === false) out.voiceLead = false;
    if (r && r.kit === 'tabla') out.kit = 'tabla';
    return out;
  });
  return { rings, bpm: int(data.bpm, 40, 220, 96), beats: int(data.beats, 2, 64, 4) };
}

// ---------- Header, menus, modals ----------
function populateSelects() {
  const sel = $('curriculumSelect');
  const groups = {};
  CURRICULUM.forEach(i => (groups[i.group] = groups[i.group] || []).push(i));
  Object.entries(groups).forEach(([g, items]) => {
    const og = document.createElement('optgroup'); og.label = g;
    items.forEach(it => { const o = document.createElement('option'); o.value = it.id; o.textContent = it.title; og.appendChild(o); });
    sel.appendChild(og);
  });
  const bs = $('beatsSelect');
  [...Array.from({ length: 15 }, (_, i) => i + 2), 18, 20, 24, 32, 48, 64].forEach(b => { const o = document.createElement('option'); o.value = String(b); o.textContent = String(b); bs.appendChild(o); });
}

$('curriculumSelect').onchange = e => loadItem(e.target.value);
const stepItem = d => { const i = CURRICULUM.findIndex(x => x.id === state.currentItemId); loadItem(CURRICULUM[(i + d + CURRICULUM.length) % CURRICULUM.length].id); };
$('prevLessonBtn').onclick = () => stepItem(-1);
$('nextLessonBtn').onclick = () => stepItem(1);
$('playPauseBtn').onclick = togglePlay;
$('stopResetBtn').onclick = stopAndReset;
$('bpmDownBtn').onclick = () => setBpm(state.bpm - 4);
$('bpmUpBtn').onclick = () => setBpm(state.bpm + 4);
$('bpmInput').onchange = e => { const v = Number(e.target.value); if (!Number.isNaN(v)) setBpm(v); e.target.value = state.bpm; };
$('beatsSelect').onchange = e => { edit(() => {}); setBeats(Number(e.target.value)); autosave(); };
$('editToggle').onclick = () => (state.tryMode ? exitEditMode() : enterEditMode());
$('tryYourselfBtn').onclick = () => (state.tryMode ? exitEditMode() : enterEditMode());
const toggleLayers = () => { state.layersOpen = !state.layersOpen; refreshModeUI(); };
$('layersBtn').onclick = toggleLayers;
$('modePills').addEventListener('click', e => {
  const b = e.target.closest('button[data-mode]'); if (!b) return;
  if (b.dataset.mode === 'create' && !isCreate()) loadItem(store.get('concentric-last-create') || 'create-pop');
  if (b.dataset.mode === 'learn' && isCreate()) loadItem(store.get('concentric-last-learn') || '1.1');
});
$('mobileCreateBtn').onclick = () => {
  if (mystery.mode) endMystery(false);
  loadItem(isCreate() ? (store.get('concentric-last-learn') || '1.1') : (store.get('concentric-last-create') || 'create-pop'));
};
$('dockBrushBtn').onclick = () => { state.createDock = false; setDrawerOpen(true); refreshModeUI(); };
$('undoBtn').onclick = undo;
$('redoBtn').onclick = redo;
$('resetUserWheelBtn').onclick = resetEdits;

const hold = $('holdPeekBtn');
hold.addEventListener('pointerdown', e => { e.preventDefault(); hold.setPointerCapture(e.pointerId); peek(true); });
hold.addEventListener('pointerup', () => peek(false));
hold.addEventListener('pointercancel', () => peek(false));
hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); peek(true); } });
hold.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); peek(false); } });

// "More" menu: share, record, settings, help (DR-01)
const menu = $('moreMenu'), moreBtn = $('moreBtn');
const setMenu = open => { menu.classList.toggle('hidden', !open); moreBtn.setAttribute('aria-expanded', String(open)); };
moreBtn.onclick = e => {
  e.stopPropagation();
  const share = canShare();
  ['recordAudioBtn', 'exportJsonBtn', 'shareLinkBtn', 'videoBtn', 'posterBtn'].forEach(id => { $(id).setAttribute('aria-disabled', String(!share)); $(id).classList.toggle('menu-off', !share); });
  $('shareNote').classList.toggle('hidden', share);
  setMenu(menu.classList.contains('hidden'));
};
document.addEventListener('pointerdown', e => { if (!menu.contains(e.target) && e.target !== moreBtn && !moreBtn.contains(e.target)) setMenu(false); });
menu.addEventListener('click', e => { if (e.target.closest('.menu-item')) setMenu(false); });
$('layersMenuBtn').onclick = toggleLayers;
$('stopMenuBtn').onclick = stopAndReset;

$('recordAudioBtn').onclick = () => !(blockedShare() && !audio.isRecording) && audio.toggleRecording(rec => {
  $('recLabel').textContent = rec ? 'Stop recording and save' : 'Record audio';
  $('recBadge').classList.toggle('hidden', !rec);
  track(rec ? 'audio-record-start' : 'audio-record-saved');
}, showToast);

$('exportJsonBtn').onclick = () => {
  if (blockedShare()) return;
  const rings = getActiveRings().map(r => ({ name: r.name, instrument: r.instrument, role: r.role, ...(r.voiceLead === false ? { voiceLead: false } : {}), steps: r.steps }));
  const blob = new Blob([JSON.stringify({ app: 'Concentric', version: 3, bpm: state.bpm, beats: state.beats, rings }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `concentric-${state.currentItemId}-${Date.now()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  showToast('Preset saved.');
  track('export');
};
$('importJsonBtn').onclick = () => $('importJsonFile').click();
$('importJsonFile').onchange = e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 512 * 1024) { showToast('That file is too large to be a preset.'); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const p = sanitizePreset(JSON.parse(ev.target.result));
      edit(() => { state.userRings = p.rings; }, { structural: true });
      setBeats(p.beats); setBpm(p.bpm);
      autosave();
      showToast('Preset opened as your version.');
    } catch (err) {
      showToast('That file is not a valid Concentric preset.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};

$('addRingBtn').onclick = () => {
  if (state.userRings.length >= 5) { showToast('Up to 5 rings.'); return; }
  edit(rs => {
    const i = rs.length;
    const instrument = i === 1 ? 'grand_piano' : i === 2 ? 'marimba' : 'percussion';
    rs.push({ name: `Layer ${i + 1}`, instrument, role: instrument === 'percussion' ? 'percussion' : 'melody', steps: makeSteps(state.beats) });
  }, { structural: true });
  state.dockRing = state.userRings.length - 1; renderDock();
};
$('removeRingBtn').onclick = () => {
  if (state.userRings.length <= 1) { showToast('At least one ring stays.'); return; }
  edit(rs => { rs.pop(); }, { structural: true });
  closeDotPopover();
};

$('toggleDrawerBtn').onclick = () => setDrawerOpen(!state.drawerOpen);
$('collapseDrawerBtn').onclick = () => setDrawerOpen(false);
$('sheetHandle').onclick = () => { if (sheetDrag.justDragged) return; setDrawerOpen(!state.drawerOpen); };

// Phones: the guide is a bottom sheet. Swipe it up or down by its top strip (or anywhere on it while it is
// collapsed); a tap on the collapsed strip opens it. The sheet follows the finger and settles on release.
const sheetDrag = { justDragged: false };
(() => {
  const d = $('lessonDrawer'), PEEK = 66;
  let drag = null;
  const canStart = e => {
    if (!isMobile() || document.body.classList.contains('dock-open')) return false;
    if (e.target.closest('#sheetHandle')) return true;
    if (e.target.closest('button, a, input, select, textarea, [role="button"]')) return false;
    if (!state.drawerOpen) return true;                                   // collapsed: the whole visible strip
    return e.clientY - d.getBoundingClientRect().top < 56;                 // open: only the top strip
  };
  d.addEventListener('pointerdown', e => {
    if (!canStart(e)) return;
    const h = d.offsetHeight;
    drag = { id: e.pointerId, y0: e.clientY, base: state.drawerOpen ? 0 : h - PEEK, max: h - PEEK, moved: false, t0: performance.now() };
  });
  d.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(dy) < 8) return;
    if (!drag.moved) { drag.moved = true; d.setPointerCapture(e.pointerId); d.style.transition = 'none'; }
    d.style.transform = `translateY(${Math.max(0, Math.min(drag.max, drag.base + dy))}px)`;
    e.preventDefault();
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const g = drag; drag = null;
    d.style.transition = ''; d.style.transform = '';
    if (!g.moved) { // a tap on the collapsed strip opens the guide
      if (!state.drawerOpen && !e.target.closest('#sheetHandle') && e.type === 'pointerup') setDrawerOpen(true);
      return;
    }
    const dy = e.clientY - g.y0, fast = Math.abs(dy) / Math.max(1, performance.now() - g.t0) > 0.5;
    const open = (fast || Math.abs(dy) > 60) ? dy < 0 : state.drawerOpen;
    setDrawerOpen(open);
    sheetDrag.justDragged = true; setTimeout(() => { sheetDrag.justDragged = false; }, 300);
  };
  d.addEventListener('pointerup', end);
  d.addEventListener('pointercancel', end);
})();
$('behindSoundToggle').onclick = () => {
  state.behindSoundOpen = !state.behindSoundOpen;
  $('behindSoundBody').classList.toggle('hidden', !state.behindSoundOpen);
  $('behindSoundToggle').setAttribute('aria-expanded', String(state.behindSoundOpen));
  $('behindSoundChevron').style.transform = state.behindSoundOpen ? 'rotate(180deg)' : '';
};

// Modals
let lastFocus = null;
function openModal(id) { lastFocus = document.activeElement; const m = $(id); m.classList.remove('hidden'); m.querySelector('.modal-close').focus(); }
function closeModals() {
  const open = [...document.querySelectorAll('.modal')].some(m => !m.classList.contains('hidden'));
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  if (open && lastFocus) { lastFocus.focus(); lastFocus = null; }
}
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModals(); });
  m.querySelector('.modal-close').onclick = closeModals;
});
$('helpBtn').onclick = () => {
  const order = [0, 2, 4, 5, 7, 9, 11];
  $('helpColours').textContent = `${order.map(pc => `${NOTE_NAMES[pc]} is ${hueName(pc)}`).join(', ')}${getPalette() === 'fifths' ? ' (circle-of-fifths colours)' : ''}.`;
  openModal('helpModal');
};

// Settings
function renderSettings() {
  const seg = (id, val) => $(id).querySelectorAll('button').forEach(b => { const on = b.dataset.v === val; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  seg('setQuality', settings.quality); seg('setPalette', settings.palette); seg('setLetters', settings.letters); seg('setHaptics', settings.haptics); seg('setVisual', settings.visual);
  $('setSync').value = settings.syncMs; $('setSyncVal').textContent = `${settings.syncMs} ms`;
}
$('settingsBtn').onclick = () => { renderSettings(); openModal('settingsModal'); };
const onSeg = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; fn(b.dataset.v); saveSettings(); renderSettings(); });
onSeg('setQuality', v => { settings.quality = v; applyTier(v === 'auto' ? detectTier() : v); if (v !== 'auto' && audio.ctx) showToast('Reload the page to apply the audio part of this change.'); });
onSeg('setPalette', v => { settings.palette = v; setPalette(v); renderer.invalidate(); requestDraw(); renderDrawerContent(); });
onSeg('setLetters', v => { settings.letters = v; renderer.invalidate(); requestDraw(); });
onSeg('setHaptics', v => { settings.haptics = v; if (v === 'on') haptic(15); });
onSeg('setVisual', v => { settings.visual = v; if (v === 'on') flashBeat(0); });
$('setSync').oninput = e => {
  settings.syncMs = Number(e.target.value);
  scheduler.extraLatency = settings.syncMs / 1000;
  $('setSyncVal').textContent = `${settings.syncMs} ms`;
  saveSettings();
};

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (e.key === 'Escape') { closeDotPopover(); closeModals(); setMenu(false); library.close(); return; }
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
  if (e.code === 'Space') { e.preventDefault(); if (tag === 'BUTTON') e.target.blur(); togglePlay(); }
  else if ((e.key === 't' || e.key === 'T') && !mod) { audio.unlock(); tapTempo(); }
  else if ((e.key === 'l' || e.key === 'L') && !mod && !EMBED) { e.preventDefault(); library.open(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space' && e.target.tagName === 'BUTTON') e.preventDefault(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) requestDraw(); });

// Phones: the wheel's bottom band follows the dock's real height, so the dock never covers the wheel.
new ResizeObserver(() => {
  const h = $('dock').classList.contains('hidden') ? 0 : $('dock').offsetHeight;
  document.documentElement.style.setProperty('--dock-h', `${Math.max(128, h)}px`);
}).observe($('dock'));

// Canvas sizing follows its container (drawer open/close, rotation, window resize) — LT-10
new ResizeObserver(entries => {
  const r = entries[0].contentRect;
  renderer.resize(r.width, r.height);
  requestDraw();
}).observe($('wheelStage'));

// Offline support (DR-05)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !DEBUG) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // When a newly published version takes over, reload once so the page uses the new files straight away.
  if (navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || state.isPlaying) return; reloaded = true; location.reload(); });
  }
}

// ---------- Library (replaces the long dropdown) ----------
const library = createLibrary({ items: CURRICULUM, progress, getCurrent: () => state.currentItemId, onPick: id => { if (mystery.mode) endMystery(false); loadItem(id); } });
$('libraryBtn').onclick = () => library.open();

// ---------- Share, embed, teach (pass 3) ----------
async function shareUrls() {
  const item = currentItem(), base = baseUrl();
  const q = `?item=${encodeURIComponent(item.id)}${state.activeSceneIndex ? `&scene=${state.activeSceneIndex}` : ''}`;
  let hash = '';
  if (state.userEdited && !item.locked) {
    try { hash = '#w=' + await encodePiece({ item: item.id, scene: state.activeSceneIndex, bpm: state.bpm, beats: state.beats, rings: state.userRings }); } catch (e) { hash = ''; }
  }
  return { link: base + q + hash, embed: base + q + '&embed=1' + hash, present: base + q + '&present=1' + hash, assign: base + q, hash };
}
let urls = null;
const updateAssign = () => { if (!urls) return; const t = $('assignTask').value.trim(); $('assignInput').value = urls.assign + (t ? `&a=${encodeURIComponent(t)}` : '') + urls.hash; };
$('shareLinkBtn').onclick = async () => {
  if (blockedShare()) return;
  urls = await shareUrls();
  const item = currentItem();
  $('shareLinkInput').value = urls.link;
  $('shareLinkHelp').textContent = state.userEdited ? 'Your edited version travels inside the link: nothing is uploaded.' : 'Opens this piece. Edit it first to share your own version.';
  $('embedInput').value = `<iframe src="${urls.embed}" width="420" height="560" style="border:0;border-radius:16px;max-width:100%" allow="autoplay" title="${esc(item.title)} — Concentric"></iframe>`;
  $('presentInput').value = urls.present; $('presentOpen').href = urls.present;
  updateAssign();
  $('nativeShareBtn').classList.toggle('hidden', !navigator.share);
  openModal('shareModal');
  track('share-open');
};
$('assignTask').addEventListener('input', updateAssign);
$('nativeShareBtn').onclick = () => { navigator.share({ title: currentItem().title + ' — Concentric', url: $('shareLinkInput').value }).then(() => track('share-link-sent')).catch(() => {}); };
document.querySelectorAll('.copy-btn').forEach(b => b.onclick = async () => {
  const el = $(b.dataset.copy);
  try { await navigator.clipboard.writeText(el.value); } catch (e) { el.select(); try { document.execCommand('copy'); } catch (e2) {} }
  track({ shareLinkInput: 'share-link-copied', embedInput: 'share-embed-copied', presentInput: 'share-projector-copied', assignInput: 'share-assignment-copied' }[b.dataset.copy] || 'share-copied');
  const old = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = old; }, 1400);
});

// ---------- Poster and 9:16 video ----------
const eduNotice = () => { const it = currentItem(); if (it.isFamousSong && it.rights !== 'pd') showToast('Educational arrangement: fine for study and sharing with credit, not for commercial use.', 4200); };
// Title and composer for exports: remembered per piece (title) and per browser (your name).
const titleKey = () => `concentric-title:${state.currentItemId}`;
const defaultTitle = () => (isCreate() ? 'Untitled sketch' : currentItem().title.replace(/^\d+(\.\d+)?\.?\s*/, ''));
let exportKind = null;
function openExport(kind) {
  if (kind === 'video' && stopVideo) { stopVideo(); return; }
  if (blockedShare()) return;
  exportKind = kind;
  $('expHeading').textContent = kind === 'video' ? 'Video for Reels / Shorts (9:16)' : 'Poster image (PNG)';
  $('expTitle').value = store.get(titleKey()) || defaultTitle();
  $('expComposer').value = settings.composer || '';
  $('expGo').textContent = kind === 'video' ? 'Record video' : 'Save poster';
  $('expCaptionsRow').classList.toggle('hidden', isCreate());
  $('expCaptions').checked = !isCreate() && settings.exportCaptions !== 'off';
  openModal('exportModal');
  $('expTitle').focus(); $('expTitle').select();
}
/** One line under the wheel on posters and videos, above the address. */
const TAGLINE = 'Music — made on wheels';
/** "sunboo.github.io/musiconwheels": the address people can type, without https:// or index.html. */
/**
 * A private, off-screen copy of the wheel for posters and videos: drawn at a fixed 2× scale (sharp at any
 * phone size), with no edit outline, hover or focus marks. Posters are a still frame: needle at 12:00, no
 * playing wedge or ripples. Videos follow the live needle.
 */
const NO_FLASH = new Float64Array(8 * 128).fill(-1), NO_DUR = new Float32Array(8 * 128).fill(0.3);
function exportRenderer(cssSide, live) {
  const r = new WheelRenderer(document.createElement('canvas'), document.createElement('canvas'), () => ({
    ...renderer.view(), hovered: null, editing: null, focus: null, editMode: false,
    ...(live ? {} : { playing: false, phase: 0, flash: NO_FLASH, flashDur: NO_DUR })
  }));
  r.fixedDpr = 2;
  r.resize(cssSide, cssSide);
  r.draw();
  return r;
}
const siteLabel = () => ((location.host + location.pathname).replace(/index\.html$/, '').replace(/\/$/, '') || 'concentric');
const exportMeta = () => {
  const title = ($('expTitle').value.trim() || defaultTitle()).slice(0, 80);
  const composer = $('expComposer').value.trim().slice(0, 60);
  return { stat: $('wheelStatic'), dyn: canvas, title, byline: composer ? `Composed by ${composer}` : '', clean: true,
    tagline: TAGLINE, footer: siteLabel(), file: (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'concentric').slice(0, 40) };
};
$('posterBtn').onclick = () => openExport('poster');
let stopVideo = null;
function videoState(on) { $('videoLabel').textContent = on ? 'Stop video and save' : 'Video for Reels / Shorts (9:16)'; $('recBadge').classList.toggle('hidden', !on); }
$('videoBtn').onclick = () => openExport('video');
$('exportForm').addEventListener('submit', e => {
  e.preventDefault();
  const meta = exportMeta(), captions = $('expCaptions').checked;
  store.set(titleKey(), meta.title);
  settings.composer = $('expComposer').value.trim().slice(0, 60);
  if (!isCreate()) settings.exportCaptions = captions ? 'on' : 'off';
  saveSettings();
  closeModals();
  eduNotice();
  const caption = () => (captions ? $('stageCaption').textContent : '');
  if (exportKind === 'poster') {
    const still = exportRenderer(540, false);
    exportPoster({ ...meta, stat: still.layer, dyn: still.canvas, caption: caption() }).then(ok => { if (ok) { showToast('Poster saved.'); track('poster'); } });
    return;
  }
  audio.unlock(); audio.ensureContext();
  stopAndReset();
  startPlayback();
  const seconds = Math.max(6, Math.min(30, loopSeconds() * 2));
  const live = exportRenderer(360, true);
  stopVideo = recordVideo({
    meta: { ...meta, stat: live.layer, dyn: live.canvas }, getCaption: caption, beforeFrame: () => live.draw(), audioStream: audio.recDest && audio.recDest.stream, seconds,
    onDone: fmt => { stopVideo = null; videoState(false); pausePlayback(); showToast(`Video saved (${fmt}, 9:16).`); track('video'); },
    onError: msg => { stopVideo = null; videoState(false); showToast(msg, 4200); }
  });
  if (stopVideo) { videoState(true); showToast(`Recording ${Math.round(seconds)} s of video…`); }
});

// ---------- Show the notes ----------
$('notesBtn').onclick = () => {
  const it = currentItem(), sc = currentScene(it), rings = getActiveRings();
  const ts = (sc && sc.timeSig) || it.timeSig || '';
  const mel = pickMelody(rings);
  $('notesTitle').textContent = `The notes: ${it.title.replace(/^\d+\.\d*\s*/, '')}`;
  $('notesMeta').textContent = [ts || `${state.beats} beats`, `${Math.round(state.bpm)} BPM`, mel ? `melody ring: ${mel.name}` : ''].filter(Boolean).join(' · ');
  $('notesStaff').innerHTML = renderStaff(rings, state.beats, /^\d+\/\d+$/.test(ts) ? ts : '');
  openModal('notesModal');
  track('notes');
};

// ---------- Remix ----------
function renderRemix() {
  const seg = (id, val) => $(id).querySelectorAll('button').forEach(b => { const on = b.dataset.v === String(val); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const sw = swingNow();
  seg('remixSwing', sw >= 0.665 ? '0.67' : sw > 0.5 ? '0.62' : '0.5');
  seg('remixFaster', state.remix.faster ? 'on' : 'off');
  seg('remixBuild', state.remix.build ? 'on' : 'off');
}
$('remixBtn').onclick = () => { if (isLocked()) { lockedToast(); return; } renderRemix(); openModal('remixModal'); };
const remixed = () => celebrate(progress.earn('remixer'));
$('remixSwing').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.remix.swing = Number(b.dataset.v); renderRemix(); remixed(); });
$('remixFaster').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.remix.faster = b.dataset.v === 'on'; if (!state.remix.faster) setBpm(state.startBpm); renderRemix(); remixed(); });
$('remixBuild').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  state.remix.build = b.dataset.v === 'on'; state.buildLevel = state.remix.build ? 1 : 99;
  renderer.invalidate(); requestDraw(); updateMixUI(); renderRemix(); remixed();
});
const melodyIndex = rs => { const m = pickMelody(rs); return m ? rs.indexOf(m) : -1; };
$('remixRotate').onclick = () => { edit(rs => { const r = rs[melodyIndex(rs)]; if (!r) return; const k = Math.max(1, Math.round(r.steps.length / state.beats)); for (let i = 0; i < k; i++) r.steps.unshift(r.steps.pop()); }); remixed(); };
$('remixSwap').onclick = () => {
  edit(rs => { const tonal = rs.filter(r => r.instrument !== 'percussion' && r.instrument !== 'sleigh_bells'); const insts = tonal.map(r => r.instrument); tonal.forEach((r, i) => { r.instrument = insts[(i + 1) % insts.length]; }); if (tonal.length === 1) tonal[0].instrument = { marimba: 'electric_piano', electric_piano: 'grand_piano', grand_piano: 'strings', strings: 'marimba' }[tonal[0].instrument] || 'marimba'; }, { structural: true });
  remixed();
};
$('remixMinor').onclick = () => { const flip = { major: 'minor', minor: 'major', dom7: 'm7', m7: 'dom7', maj7: 'm7' }; edit(rs => rs.forEach(r => r.steps.forEach(st => { if (st.active && flip[st.chord]) st.chord = flip[st.chord]; }))); remixed(); };
$('remixOctave').onclick = () => { edit(rs => { const r = rs[melodyIndex(rs)]; if (!r) return; const up = r.steps.every(st => !st.active || st.octave < 6); r.steps.forEach(st => { if (st.active) st.octave = Math.max(1, Math.min(6, st.octave + (up ? 1 : -1))); }); }); remixed(); };

// ---------- Mystery mode: the opener, ear checks and the daily puzzle ----------
function setVeil({ eyebrow, title, help = '', options = [], secondary = null, reveal = 'Reveal' }) {
  $('mysteryEyebrow').textContent = eyebrow; $('mysteryTitle').textContent = title; $('mysteryHelp').textContent = help;
  $('mysteryResult').textContent = '';
  const box = $('mysteryOptions');
  box.innerHTML = options.map((o, i) => `<button data-opt="${i}" class="mystery-opt">${esc(o)}</button>`).join('');
  const sec = $('mysteryShare');
  sec.classList.toggle('hidden', !secondary);
  if (secondary) { sec.textContent = secondary.label; sec.onclick = secondary.fn; }
  $('mysteryReveal').textContent = reveal;
}
function beginMystery(mode, id, sceneIndex = null) {
  if (state.isPlaying) pausePlayback();
  mystery.mode = mode; mystery.loading = true; mystery.tries = 0; mystery.done = false;
  if (sceneIndex != null) { state.activeSceneIndex = sceneIndex; loadItem(id, true); } else loadItem(id);
  mystery.loading = false;
  setDrawerOpen(false);
  document.body.classList.add('mystery');
  $('mysteryVeil').classList.remove('hidden');
  $('libraryBtnLabel').textContent = 'Mystery tune';
  $('mysteryPlay').textContent = '▶ Play';
}
function endMystery(reveal = true) {
  if (!mystery.mode) return;
  const mode = mystery.mode;
  mystery.mode = null;
  document.body.classList.remove('mystery');
  $('mysteryVeil').classList.add('hidden');
  $('libraryBtnLabel').textContent = currentItem().title;
  renderDrawerContent();
  if (reveal && mode === 'opener') {
    showToast('Pachelbel’s Canon in D (c. 1680). The guide shows how it’s built.', 4200);
    if (!isMobile()) setDrawerOpen(true);
  }
}
$('mysteryPlay').onclick = () => { togglePlay(); $('mysteryPlay').textContent = state.isPlaying ? '❚❚ Pause' : '▶ Play'; };
$('mysteryReveal').onclick = () => endMystery(true);
const shortTitle = t => t.replace(/^\d+\.\s*/, '').replace(/\s*\(.*?\)\s*/g, ' ').split(' — ')[0].trim();

function startOpener() {
  beginMystery('opener', 'song-canon');
  setVeil({ eyebrow: 'Welcome to Concentric', title: 'Press play. Can you name this tune?', help: 'It’s one of the most-played pieces ever written, and you’re about to see how it works.' });
}

function startEarCheck() {
  const item = currentItem();
  if (!(item.labType === 'sceneFlip' && item.scenes && item.scenes.length > 1)) { showToast('Ear checks work on lessons with Compare buttons (for example 1.4, 2.2 or 4.4).', 4200); return; }
  const k = Math.floor(Math.random() * item.scenes.length);
  beginMystery('ear', item.id, k);
  mystery.answer = k;
  setVeil({ eyebrow: `Ear check · ${item.title.split(' ')[0]}`, title: 'Which one is playing?', help: 'Press play, listen, then choose.', options: item.scenes.map(sc => sc.label), reveal: 'Show me' });
  startPlayback(); $('mysteryPlay').textContent = '❚❚ Pause';
}
$('earBtn').onclick = () => startEarCheck();

function dailyPick() {
  const pool = CURRICULUM.filter(i => i.rights === 'pd' && i.isFamousSong && !i.locked);
  const n = progress.dailyNumber(), rnd = seeded(n * 2654435761);
  const answer = pool[Math.floor(rnd() * pool.length)];
  const others = pool.filter(i => i !== answer).sort(() => rnd() - 0.5).slice(0, 3);
  const options = [answer, ...others].sort(() => rnd() - 0.5);
  return { n, answer, options };
}
function dailyShareText(st, n) {
  const stars = st.solved ? '★'.repeat(4 - st.tries) + '☆'.repeat(st.tries - 1) : '☆☆☆';
  return `Concentric Daily #${n} ${stars} ${st.solved ? `in ${st.tries}/3` : 'X/3'} · streak ${progress.dailyStreak()}\n${baseUrl()}?daily=1`;
}
function startDaily() {
  const d = dailyPick();
  beginMystery('daily', d.answer.id);
  mystery.answer = d.answer.id; mystery.daily = d;
  const prior = progress.dailyState();
  setVeil({ eyebrow: `Daily puzzle #${d.n}`, title: 'Name today’s tune', help: 'Three tries. Everyone gets the same tune today.', options: d.options.map(o => shortTitle(o.title)) });
  if (prior) {
    mystery.done = true;
    $('mysteryOptions').querySelectorAll('button').forEach((b, i) => { b.disabled = true; if (d.options[i] === d.answer) b.classList.add('right'); });
    $('mysteryResult').textContent = prior.solved ? `You got it in ${prior.tries}. Streak: ${progress.dailyStreak()}. New tune tomorrow.` : 'Today’s is done. New tune tomorrow.';
    showDailyShare(prior, d.n);
  } else { startPlayback(); $('mysteryPlay').textContent = '❚❚ Pause'; }
  track('daily-open');
}
function showDailyShare(st, n) {
  const sec = $('mysteryShare'); sec.classList.remove('hidden'); sec.textContent = 'Copy result';
  sec.onclick = async () => { const t = dailyShareText(st, n); try { await navigator.clipboard.writeText(t); showToast('Result copied. Paste it anywhere.'); track('daily-result-copied'); } catch (e) { showToast(t, 5000); } };
}
$('mysteryOptions').addEventListener('click', e => {
  const b = e.target.closest('[data-opt]'); if (!b || mystery.done) return;
  const i = Number(b.dataset.opt);
  if (mystery.mode === 'ear') {
    const ok = i === mystery.answer;
    mystery.done = true;
    $('mysteryOptions').querySelectorAll('button').forEach((x, j) => { x.disabled = true; if (j === mystery.answer) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('mysteryResult').textContent = ok ? 'Right! Your ears are learning.' : `Not quite: it was “${currentItem().scenes[mystery.answer].label}”.`;
    if (ok) celebrate(progress.earCorrect());
    const sec = $('mysteryShare'); sec.classList.remove('hidden'); sec.textContent = 'Another one'; sec.onclick = () => startEarCheck();
    track(ok ? 'ear-right' : 'ear-wrong');
    return;
  }
  if (mystery.mode === 'daily') {
    const d = mystery.daily;
    mystery.tries++;
    const ok = d.options[i] === d.answer;
    if (ok || mystery.tries >= 3) {
      mystery.done = true;
      $('mysteryOptions').querySelectorAll('button').forEach((x, j) => { x.disabled = true; if (d.options[j] === d.answer) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      const st = { solved: ok, tries: mystery.tries };
      celebrate(progress.setDaily(st));
      updateDailyPill();
      $('mysteryResult').textContent = ok ? `Yes! ${shortTitle(d.answer.title)}, in ${mystery.tries}. Streak: ${progress.dailyStreak()}.` : `It was ${shortTitle(d.answer.title)}. New tune tomorrow.`;
      showDailyShare(st, d.n);
      track(ok ? 'daily-solved' : 'daily-failed');
    } else {
      b.disabled = true; b.classList.add('wrong');
      $('mysteryResult').textContent = `Not that one. ${3 - mystery.tries} ${3 - mystery.tries === 1 ? 'try' : 'tries'} left.`;
    }
  }
});
function updateDailyPill() {
  const st = progress.dailyStreak(), today = progress.dailyState();
  $('dailyStreak').textContent = st ? ` ${st}` : '';
  $('dailyBtn').classList.toggle('done', !!today);
  $('dailyBtn').title = today ? 'Daily puzzle: done for today' : 'Daily puzzle: name today’s tune';
}
$('dailyBtn').onclick = () => startDaily();
$('dailyMenuBtn').onclick = () => startDaily();
updateDailyPill();

// ---------- Assignment banner, embed link ----------
if (params.get('a')) {
  $('assignText').textContent = params.get('a').slice(0, 280);
  $('assignBanner').classList.remove('hidden');
  $('assignClose').onclick = () => $('assignBanner').classList.add('hidden');
}

// ---------- Start ----------
populateSelects();
{ // Reopen wherever you left off (or ?item=<id>&scene=<n>)
  const want = params.get('item') || store.get('concentric-last');
  const firstVisit = !store.get('concentric-last') && !params.has('item') && !location.hash && !EMBED && !PRESENT && !DEBUG && !navigator.webdriver;
  const id = CURRICULUM.some(i => i.id === want) ? want : '1.1';
  const scene = Number(params.get('scene')) || 0;
  if (scene && (CURRICULUM.find(i => i.id === id).scenes || [])[scene]) { state.activeSceneIndex = scene; loadItem(id, true); setDrawerOpen(!isMobile() && !currentItem().isFamousSong); }
  else loadItem(id);
  if (EMBED || PRESENT) setDrawerOpen(false);
  if (EMBED) { const u = new URL(location.href); u.searchParams.delete('embed'); $('embedOpen').href = u.toString(); $('embedOpen').classList.remove('hidden'); }
  if (params.has('daily')) startDaily();
  else if (firstVisit || params.has('opener')) startOpener();
}
if (location.hash.startsWith('#w=')) { // a shared version
  decodePiece(location.hash.slice(3)).then(piece => {
    const it = CURRICULUM.find(i => i.id === piece.item);
    if (it && it.locked) return;
    const clean = sanitizePreset({ rings: piece.rings, bpm: piece.bpm, beats: piece.beats });
    if (it && it.id !== state.currentItemId) { state.activeSceneIndex = piece.scene; loadItem(it.id, !!piece.scene); }
    if (!it) loadItem('create-blank');
    enterEditMode();
    state.userRings = clean.rings; state.userEdited = true;
    setBeats(clean.beats); setBpm(clean.bpm);
    autosave(); bump(); renderDock(); updateMatch();
    showToast(isCreate() ? 'Opened a shared sketch.' : 'Opened a shared version. Hold for original to compare.', 4200);
    track('share-open-link');
  }).catch(() => showToast('That share link is damaged or incomplete.'));
}
if (DEBUG) {
  import('./lint.js').then(m => m.lintCurriculum(CURRICULUM));
  window.__concentric = { state, audio, scheduler, renderer };
}
window.__bench = { audio, scheduler, state, loadItem, startPlayback, renderer, undo, redo, settings, progress, library, startDaily, startEarCheck, startOpener, endMystery };
