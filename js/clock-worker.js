// Steady tick for the scheduler. Worker timers keep running when the tab is in the background,
// where main-thread timers get throttled to about once per second.
let id = null;
onmessage = e => {
  if (e.data === 'start' && id === null) id = setInterval(() => postMessage('tick'), 25);
  else if (e.data === 'stop' && id !== null) { clearInterval(id); id = null; }
};
