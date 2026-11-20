// Poster (PNG) and vertical video (9:16) exports, drawn from the two wheel canvases.
const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function wrap(c, text, x, y, maxW, lh, maxLines = 3) {
  const words = String(text || '').split(/\s+/);
  let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (c.measureText(test).width > maxW && line) {
      if (++n === maxLines) { c.fillText(line + '…', x, y); return y + lh; }
      c.fillText(line, x, y); y += lh; line = words[i];
    } else line = test;
  }
  if (line) { c.fillText(line, x, y); y += lh; }
  return y;
}

/** Draw one frame: title, wheel, caption, footer. */
export function composeFrame(c, W, H, { stat, dyn, title, sub, byline, clean, caption, footer, tagline }) {
  c.fillStyle = '#0b0d11'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, H * 0.48, 10, W / 2, H * 0.48, W * 0.8);
  g.addColorStop(0, 'rgba(251,191,36,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const pad = W * 0.07;
  c.textBaseline = 'top';
  let y;
  if (clean) { // only the title and the composer above the wheel, centred
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = `700 ${Math.round(W * 0.064)}px ${FONT}`;
    y = wrap(c, title, W / 2, pad * 1.3, W - pad * 2, W * 0.076, 2);
    if (byline) { c.fillStyle = '#fbbf24'; c.font = `500 ${Math.round(W * 0.036)}px ${FONT}`; y = wrap(c, byline, W / 2, y + W * 0.01, W - pad * 2, W * 0.046, 1); }
    c.textAlign = 'left';
  } else {
    c.textAlign = 'left';
    c.fillStyle = '#fbbf24'; c.font = `600 ${Math.round(W * 0.026)}px ${FONT}`;
    c.fillText('CONCENTRIC · SEE MUSIC ON A CIRCLE', pad, pad);
    c.fillStyle = '#fff'; c.font = `700 ${Math.round(W * 0.056)}px ${FONT}`;
    y = wrap(c, title, pad, pad + W * 0.05, W - pad * 2, W * 0.066, 2);
    if (sub) { c.fillStyle = 'rgba(255,255,255,0.72)'; c.font = `400 ${Math.round(W * 0.032)}px ${FONT}`; y = wrap(c, sub, pad, y + W * 0.012, W - pad * 2, W * 0.044, 3); }
  }
  // Wheel: crop the square that holds the dial from the stage canvases
  const foot = tagline ? 0.07 : 0; // room for the tagline line above the address
  const side = Math.min(W - pad * 0.8, H - y - W * ((caption ? 0.36 : 0.2) + foot));
  const sx = Math.max(0, (stat.width - Math.min(stat.width, stat.height)) / 2), sy = Math.max(0, (stat.height - Math.min(stat.width, stat.height)) / 2);
  const s = Math.min(stat.width, stat.height);
  const dx = (W - side) / 2, dy = caption ? y + W * 0.03 : y + Math.max(W * 0.03, (H - y - W * (0.12 + foot) - side) / 2);
  c.drawImage(stat, sx, sy, s, s, dx, dy, side, side);
  if (dyn) c.drawImage(dyn, sx, sy, s, s, dx, dy, side, side);
  if (caption) {
    c.fillStyle = 'rgba(255,255,255,0.88)'; c.font = `500 ${Math.round(W * 0.034)}px ${FONT}`; c.textAlign = 'center';
    wrap(c, caption, W / 2, dy + side + W * 0.04, W - pad * 2, W * 0.046, 3);
  }
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  if (tagline) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = `500 ${Math.round(W * 0.03)}px ${FONT}`; c.fillText(tagline, W / 2, H - pad * 0.8 - W * 0.05); }
  c.fillStyle = '#fbbf24'; c.font = `600 ${Math.round(W * 0.032)}px ${FONT}`;
  c.fillText(footer || '', W / 2, H - pad * 0.8);
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportPoster(meta) {
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  composeFrame(cv.getContext('2d'), W, H, meta);
  return new Promise(res => cv.toBlob(b => { if (b) download(b, `${meta.file || 'concentric'}-poster.png`); res(!!b); }, 'image/png'));
}

/** Record a 9:16 video of the wheel while it plays. Returns a stop() function. */
export function recordVideo({ meta, getCaption, beforeFrame, audioStream, seconds, onDone, onError }) {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) { onError('Video export is not supported in this browser. Try Chrome, Edge or a recent Safari.'); return null; }
  const W = 720, H = 1280, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const stream = cv.captureStream(30);
  if (audioStream) audioStream.getAudioTracks().forEach(t => stream.addTrack(t));
  const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  let rec;
  try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined); } catch (e) { onError('Unable to start the video recorder.'); return null; }
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  let raf = 0, stopped = false;
  const draw = () => { if (beforeFrame) beforeFrame(); composeFrame(c, W, H, { ...meta, caption: getCaption() }); raf = requestAnimationFrame(draw); };
  rec.onstop = () => {
    cancelAnimationFrame(raf);
    const type = rec.mimeType || mime || 'video/webm';
    download(new Blob(chunks, { type }), `${meta.file || 'concentric'}-9x16.${type.includes('mp4') ? 'mp4' : 'webm'}`);
    onDone(type.includes('mp4') ? 'MP4' : 'WebM');
  };
  draw();
  rec.start(500);
  const timer = setTimeout(() => stop(), seconds * 1000);
  function stop() { if (stopped) return; stopped = true; clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); }
  return stop;
}
