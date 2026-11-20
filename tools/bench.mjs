// Performance check. Serve the repo root first (e.g. `python3 -m http.server 8765`), then:
//   npm i -D playwright && npx playwright install chromium && node tools/bench.mjs [url]
// Measures note timing error, idle redraws, audio-node churn and main-thread load at normal and 6× slowed CPU.
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const args = process.argv.slice(2);
const CI = args.includes('--ci');
const URL_ = args.find(a => a.startsWith('http')) || 'http://localhost:8765/';
// Performance budget (AR-16). CI machines vary, so the CPU budget is generous; timing and churn are strict.
const BUDGET = { timingMaxMs: 2, idleRedraws: 2, audioNodes: 250, busyPct6x: 75, shellKBgz: 200 };
const failures = [];

async function run(throttle, song, ringInst) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Performance.enable');
  await p.goto(URL_, { waitUntil: 'load' });
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.evaluate(() => {
    const R = window.__bench.renderer, orig = R.draw.bind(R);
    window.__draws = 0; R.draw = () => { window.__draws++; return orig(); };
  });
  await p.waitForTimeout(3000);
  const idleDraws = await p.evaluate(() => window.__draws);
  await p.evaluate(([song, inst]) => {
    const B = window.__bench; B.loadItem(song);
    window.__on = [];
    const orig = B.audio.playStep.bind(B.audio);
    B.audio.playStep = (s, i, t, g, m) => { if (i === inst) window.__on.push(t * 1000); return orig(s, i, t, g, m); };
    B.audio.nodesCreated = 0;
    document.getElementById('playPauseBtn').click();
  }, [song, ringInst]);
  const m0 = (await cdp.send('Performance.getMetrics')).metrics;
  await p.waitForTimeout(10000);
  const m1 = (await cdp.send('Performance.getMetrics')).metrics;
  const r = await p.evaluate(() => {
    const B = window.__bench, on = window.__on;
    const loop = B.state.beats * 60 / B.state.bpm;
    return { on, nodes: B.audio.nodesCreated, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, loop };
  });
  const g = (m, k) => m.find(x => x.name === k).value;
  const busy = (g(m1, 'TaskDuration') - g(m0, 'TaskDuration')) / 10;
  await b.close();
  return { idleDraws, ...r, busy, errors };
}

function jitter(on, stepMs) {
  const dev = [];
  for (let i = 1; i < on.length; i++) { const x = on[i] - on[i - 1]; dev.push(Math.abs(x - Math.round(x / stepMs) * stepMs)); }
  dev.sort((a, b) => a - b);
  return { p95: dev[Math.floor(dev.length * 0.95)] ?? 0, max: dev[dev.length - 1] ?? 0 };
}

{ // Download size: everything the app loads on first visit, gzipped (all songs are in one file by design)
  const files = ['index.html', 'css/app.css', ...readdirSync('js').filter(f => f.endsWith('.js') && f !== 'lint.js').map(f => 'js/' + f)];
  const kb = files.reduce((a, f) => a + gzipSync(readFileSync(f)).length, 0) / 1024;
  console.log(JSON.stringify({ shellKBgz: +kb.toFixed(1), files: files.length }));
  if (kb > BUDGET.shellKBgz) failures.push(`app shell ${kb.toFixed(1)} KB gz > ${BUDGET.shellKBgz}`);
}
for (const throttle of [1, 6]) {
  const t5 = await run(throttle, 'song-take-five', 'electric_piano');
  const jit = jitter(t5.on, 60000 / 164 / 2);
  const jb = await run(throttle, 'song-jingle-bells', 'marimba');
  const row = {
    cpu: `${throttle}x`,
    timingErrorMs: { p95: +jit.p95.toFixed(2), max: +jit.max.toFixed(2) },
    redrawsWhilePaused3s: t5.idleDraws,
    audioNodes10sJingle: jb.nodes,
    mainThreadBusyPct: +(jb.busy * 100).toFixed(1),
    heapMB: jb.heapMB,
    pageErrors: [...t5.errors, ...jb.errors]
  };
  console.log(JSON.stringify(row));
  if (row.timingErrorMs.max > BUDGET.timingMaxMs) failures.push(`${row.cpu}: timing error ${row.timingErrorMs.max} ms > ${BUDGET.timingMaxMs}`);
  if (row.redrawsWhilePaused3s > BUDGET.idleRedraws) failures.push(`${row.cpu}: ${row.redrawsWhilePaused3s} redraws while paused`);
  if (row.audioNodes10sJingle > BUDGET.audioNodes) failures.push(`${row.cpu}: ${row.audioNodes10sJingle} audio nodes in 10 s`);
  if (throttle === 6 && row.mainThreadBusyPct > BUDGET.busyPct6x) failures.push(`6x: main thread ${row.mainThreadBusyPct}% busy`);
  if (row.pageErrors.length) failures.push(`${row.cpu}: page errors ${row.pageErrors.join('; ')}`);
}
if (failures.length) console.log('OVER BUDGET:\n' + failures.join('\n'));
else console.log('Within budget.');
if (CI && failures.length) process.exit(1);
