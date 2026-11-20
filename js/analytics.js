// Opt-in, cookie-free usage counts (RS-09). Does nothing unless CONFIG.goatcounter is set,
// and respects the browser's Do Not Track setting.
import { CONFIG } from './config.js';

const enabled = !!CONFIG.goatcounter && navigator.doNotTrack !== '1' && !/^(localhost|127\.)/.test(location.hostname);
const queue = [];
let ready = false;

if (enabled) {
  window.goatcounter = { no_onload: false, allow_local: false };
  const s = document.createElement('script');
  s.async = true;
  s.dataset.goatcounter = `https://${CONFIG.goatcounter}.goatcounter.com/count`;
  s.src = 'https://gc.zgo.at/count.js';
  s.onload = () => { ready = true; queue.splice(0).forEach(send); };
  document.head.appendChild(s);
  retention();
}

function send(name) {
  try { window.goatcounter.count({ path: `event/${name}`, title: name, event: true }); } catch (e) {}
}

/** Count a product event (first play, lesson complete, edit, export, record, share…). */
export function track(name) {
  if (!enabled) return;
  if (ready) send(name); else queue.push(name);
}

// Day-1 / day-7 return visits, computed on this device only.
function retention() {
  try {
    const now = Date.now(), first = Number(localStorage.getItem('concentric-first-visit') || 0);
    if (!first) { localStorage.setItem('concentric-first-visit', String(now)); track('first-visit'); return; }
    const days = Math.floor((now - first) / 86400000);
    for (const d of [1, 7, 30]) {
      const key = `concentric-return-d${d}`;
      if (days >= d && !localStorage.getItem(key)) { localStorage.setItem(key, '1'); track(`return-d${d}`); }
    }
  } catch (e) {}
}
