// Shared helper for building ring steps from a sparse map.
export function makeSteps(count, map = {}) {
  const arr = new Array(count);
  for (let i = 0; i < count; i++) {
const m = map[i];
arr[i] = m
  ? { active: true, pitchClass: m.pc ?? 0, octave: m.oct ?? 4, accent: m.acc ?? 2, chord: m.chord ?? 'single', ...(m.len ? { len: m.len } : {}), ...(m.drum ? { drum: m.drum } : {}) }
  : { active: false, pitchClass: 0, octave: 4, accent: 2, chord: 'single' };
  }
  return arr;
}
