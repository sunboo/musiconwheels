// Share links: the piece (your version) packed into the URL hash, so nothing is stored on a server.
//   #w=z<base64url(deflate-raw(json))>   or   #w=j<base64url(json)> where compression isn't available.
const b64 = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
const CH = ['single', 'major', 'minor', 'dom7', 'm7', 'maj7', 'sus4', 'dim', 'add9', 'fifth'];

async function pipe(bytes, Stream, mode) {
  const s = new Blob([bytes]).stream().pipeThrough(new Stream(mode));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** Compact form: each ring keeps only its active steps as [index, pc, oct, acc, chord, len, drum]. */
export function packPiece({ item, scene, bpm, beats, rings }) {
  return {
    v: 1, i: item, s: scene || 0, b: bpm, n: beats,
    r: rings.map(r => ({
      m: r.name, t: r.instrument, o: r.role, n: r.steps.length, ...(r.voiceLead === false ? { vl: 0 } : {}),
      a: r.steps.map((s, i) => (s.active ? [i, s.pitchClass, s.octave, s.accent, Math.max(0, CH.indexOf(s.chord)), s.len || 0, s.drum || 0] : null)).filter(Boolean)
    }))
  };
}
export function unpackPiece(o) {
  if (!o || o.v !== 1 || !Array.isArray(o.r)) throw new Error('bad link');
  return {
    item: String(o.i || ''), scene: Number(o.s) || 0, bpm: o.b, beats: o.n,
    rings: o.r.map(r => {
      const steps = Array.from({ length: Math.max(1, Math.min(128, Number(r.n) || 4)) }, () => ({ active: false, pitchClass: 0, octave: 4, accent: 2, chord: 'single' }));
      (r.a || []).forEach(([i, pc, oct, acc, ch, len, drum]) => {
        if (!steps[i]) return;
        steps[i] = { active: true, pitchClass: pc, octave: oct, accent: acc, chord: CH[ch] || 'single', ...(len ? { len } : {}), ...(drum ? { drum } : {}) };
      });
      return { name: r.m, instrument: r.t, role: r.o, ...(r.vl === 0 ? { voiceLead: false } : {}), steps };
    })
  };
}

export async function encodePiece(piece) {
  const json = new TextEncoder().encode(JSON.stringify(packPiece(piece)));
  if (typeof CompressionStream !== 'undefined') {
    try { return 'z' + b64(await pipe(json, CompressionStream, 'deflate-raw')); } catch (e) { /* fall through */ }
  }
  return 'j' + b64(json);
}
export async function decodePiece(code) {
  const kind = code[0], bytes = unb64(code.slice(1));
  if (bytes.length > 64 * 1024) throw new Error('too large');
  const raw = kind === 'z' ? await pipe(bytes, DecompressionStream, 'deflate-raw') : bytes;
  if (raw.length > 512 * 1024) throw new Error('too large');
  return unpackPiece(JSON.parse(new TextDecoder().decode(raw)));
}

export function baseUrl() { return location.origin + location.pathname; }
