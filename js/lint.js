// Data checks for songs and lessons. Runs only with ?debug=1 (and in tools/lint.mjs), never for normal users.
import { CHORDS, pcOf, NOTE_NAMES, defaultRole } from './theory.js';

export function lintPiece(label, piece) {
  const issues = [];
  const rings = (piece.rings || []).map((r, i, all) => ({ ...r, role: r.role || defaultRole(i, all.length, r.instrument) }));
  if (piece.beatCaptions && piece.beatCaptions.length !== piece.beats) issues.push(`${label}: ${piece.beatCaptions.length} captions for ${piece.beats} beats`);
  rings.forEach(r => {
    if (!r.steps.length || r.steps.length > 128) issues.push(`${label}/${r.name}: ${r.steps.length} steps`);
    r.steps.forEach((s, i) => {
      if (!s.active) return;
      if (s.pitchClass < 0 || s.pitchClass > 11 || s.octave < 1 || s.octave > 6) issues.push(`${label}/${r.name} step ${i + 1}: note out of range`);
      if (!CHORDS[s.chord]) issues.push(`${label}/${r.name} step ${i + 1}: unknown chord ${s.chord}`);
    });
  });
  // Melody vs harmony: where a chord starts, a melody note starting there must not rub a semitone
  // against the chord root (major 7th / minor 9th). This is the clash the old Brahms data had.
  const harmony = rings.find(r => r.role === 'harmony' && r.steps.some(s => s.active && s.chord !== 'single'));
  const melody = rings.find(r => r.role === 'melody');
  if (harmony && melody) {
    const n = melody.steps.length, h = harmony.steps.length;
    for (let i = 0; i < h; i++) {
      const c = harmony.steps[i];
      if (!c.active || c.chord === 'single' || (i * n) % h !== 0) continue;
      const m = melody.steps[(i * n) / h];
      if (!m || !m.active) continue;
      const d = pcOf(m.pitchClass - c.pitchClass);
      if (d === 1 || d === 11) issues.push(`${label}: melody ${NOTE_NAMES[m.pitchClass]} rubs a semitone against the ${NOTE_NAMES[c.pitchClass]} chord at harmony step ${i + 1}`);
    }
  }
  return issues;
}

export function lintCurriculum(items) {
  const issues = [];
  items.forEach(it => {
    if (it.scenes) it.scenes.forEach(sc => issues.push(...lintPiece(`${it.id} · ${sc.label}`, { ...sc, isFamousSong: it.isFamousSong })));
    else if (it.rings && it.rings.length) issues.push(...lintPiece(it.id, it));
  });
  if (typeof console !== 'undefined') {
    if (issues.length) console.warn(`[lint] ${issues.length} notes:\n` + issues.join('\n'));
    else console.info('[lint] curriculum OK');
  }
  return issues;
}
