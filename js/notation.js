// "Show the notes": the melody ring drawn on a staff, with chord symbols above.
// Spacing is proportional to time (like the wheel, unrolled); a line after each note shows its length.
import { ringGates, pcOf } from './theory.js';

const SPELL = [['C', ''], ['C', '♯'], ['D', ''], ['E', '♭'], ['E', ''], ['F', ''], ['F', '♯'], ['G', ''], ['A', '♭'], ['A', ''], ['B', '♭'], ['B', '']];
const LETTER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const SUFFIX = { single: '', major: '', minor: 'm', dom7: '7', m7: 'm7', maj7: 'maj7', sus4: 'sus4', dim: 'dim', add9: 'add9', fifth: '5' };
const CHORD_NAME = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function pickMelody(rings) {
  const tonal = rings.filter(r => r.instrument !== 'percussion' && r.instrument !== 'sleigh_bells');
  return tonal.find(r => r.role === 'melody') || tonal[tonal.length - 1] || null;
}

export function renderStaff(rings, beats, timeSig) {
  const mel = pickMelody(rings);
  if (!mel) return '<p class="text-white/70 text-[14px]">This piece is all percussion: there is no melody to write on a staff. Its rhythm is the wheel itself.</p>';
  const harm = rings.find(r => r !== mel && r.steps.some(s => s.active && s.chord && s.chord !== 'single' && s.chord !== 'fifth'));
  const n = mel.steps.length, gates = ringGates(mel);
  const active = mel.steps.map((s, i) => ({ s, i })).filter(x => x.s.active);
  const avgOct = active.reduce((a, x) => a + x.s.octave, 0) / Math.max(1, active.length);
  const treble = avgOct >= 3.5;
  const base = treble ? 4 * 7 + 2 : 2 * 7 + 4; // diatonic index of the bottom staff line (E4 or G2)
  const perBar = (() => { const m = /^(\d+)\/(\d+)$/.exec(timeSig || ''); return m ? Number(m[1]) * (m[2] === '8' ? 0.5 : 1) : 4; })();
  const beatsPerRow = Math.max(perBar, Math.min(beats, Math.round(8 / perBar) * perBar || 8));
  const rows = Math.ceil(beats / beatsPerRow);
  const W = 680, left = 56, right = 12, LS = 10, rowH = 130, top = 46;
  const usable = W - left - right;
  const out = [];
  for (let row = 0; row < rows; row++) {
    const y0 = top + row * rowH; // top staff line
    const bottom = y0 + 4 * LS;
    for (let l = 0; l < 5; l++) out.push(`<line x1="${left - 40}" x2="${W - right}" y1="${y0 + l * LS}" y2="${y0 + l * LS}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>`);
    out.push(`<text x="${left - 36}" y="${treble ? bottom - 2 : y0 + 2 * LS + 2}" font-size="${treble ? 46 : 34}" fill="rgba(255,255,255,0.8)" dominant-baseline="middle">${treble ? '𝄞' : '𝄢'}</text>`);
    if (row === 0 && /^\d+\/\d+$/.test(timeSig || '')) {
      const [a, b] = timeSig.split('/');
      out.push(`<text x="${left - 6}" y="${y0 + LS}" font-size="17" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${a}</text><text x="${left - 6}" y="${y0 + 3 * LS}" font-size="17" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${b}</text>`);
    }
    const b0 = row * beatsPerRow, b1 = Math.min(beats, b0 + beatsPerRow);
    const xOf = beat => left + 10 + ((beat - b0) / beatsPerRow) * (usable - 14);
    for (let bt = b0; bt <= b1; bt++) if (bt % perBar === 0 && bt > b0 || bt === b1) out.push(`<line x1="${xOf(bt)}" x2="${xOf(bt)}" y1="${y0}" y2="${bottom}" stroke="rgba(255,255,255,0.4)"/>`);
    // chord symbols
    let prevChord = '';
    if (harm) harm.steps.forEach((s, i) => {
      const bt = (i / harm.steps.length) * beats;
      if (!s.active || s.chord === 'single') return;
      const key = s.pitchClass + s.chord; if (key === prevChord && bt !== b0) return; prevChord = key;
      if (bt < b0 || bt >= b1) return;
      out.push(`<text x="${xOf(bt)}" y="${y0 - 22}" font-size="14" font-weight="600" fill="#fbbf24">${CHORD_NAME[pcOf(s.pitchClass)]}${SUFFIX[s.chord] ?? ''}</text>`);
    });
    active.forEach(({ s, i }) => {
      const bt = (i / n) * beats;
      if (bt < b0 || bt >= b1) return;
      const [L, acc] = SPELL[pcOf(s.pitchClass)];
      const dia = s.octave * 7 + LETTER[L];
      const y = bottom - (dia - base) * (LS / 2), x = xOf(bt) + 7;
      for (let ly = bottom + LS; ly <= y + 0.1; ly += LS) out.push(`<line x1="${x - 9}" x2="${x + 9}" y1="${ly}" y2="${ly}" stroke="rgba(255,255,255,0.45)"/>`);
      for (let ly = y0 - LS; ly >= y - 0.1; ly -= LS) out.push(`<line x1="${x - 9}" x2="${x + 9}" y1="${ly}" y2="${ly}" stroke="rgba(255,255,255,0.45)"/>`);
      const endBt = Math.min(b1, bt + (gates[i] / n) * beats);
      out.push(`<line x1="${x + 6}" x2="${Math.max(x + 6, xOf(endBt) - 2)}" y1="${y}" y2="${y}" stroke="rgba(34,211,238,0.45)" stroke-width="3" stroke-linecap="round"/>`);
      out.push(`<ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.6" transform="rotate(-20 ${x} ${y})" fill="${s.accent === 1 ? 'rgba(255,255,255,0.55)' : '#fff'}"/>`);
      if (acc) out.push(`<text x="${x - 15}" y="${y + 1}" font-size="15" fill="#fff" text-anchor="middle" dominant-baseline="middle">${acc}</text>`);
      out.push(`<text x="${x}" y="${bottom + 30}" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">${L}${acc}${s.octave}</text>`);
    });
  }
  const H = top + rows * rowH - 30;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${mel.name} written on a ${treble ? 'treble' : 'bass'} staff" font-family="Inter, ui-sans-serif, system-ui, sans-serif">${out.join('')}</svg>`;
}
