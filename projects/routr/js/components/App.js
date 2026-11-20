// Top-level state. Two modes:
//   plan  – full-size map; build a stack of stops by searching or clicking.
//   drive – map on the left, Street View on the right, playing the route.
// The control bar spans the bottom in both modes.
import { html, useEffect, useMemo, useState } from '../vendor/preact-htm.js';
import { GMAPS_KEY, MAX_STOPS, SPEED_DEFAULT } from '../config.js';
import { loadMaps } from '../maps/loader.js';
import { buildRoute } from '../maps/routing.js';
import { fmtDist, parseCoords } from '../maps/geo.js';
import { Player } from '../player.js';
import { MapView } from './MapView.js';
import { DriveView } from './DriveView.js';
import { ControlBar } from './ControlBar.js';

let nextId = 1; // stable keys for stops, so reordering moves rows instead of re-rendering them
const withId = (s) => ({ ...s, id: nextId++ });

// Stops live in the URL as repeated ?s=lat,lng[,name] (older ?from=&to= links still work).
function stopsFromUrl() {
  const q = new URLSearchParams(location.search);
  const out = [];
  for (const v of q.getAll('s')) {
    const m = v.match(/^(-?[\d.]+),(-?[\d.]+)(?:,(.*))?$/);
    if (m) out.push(withId({ ll: { lat: +m[1], lng: +m[2] }, text: m[3] || '' }));
  }
  if (!out.length) {
    for (const k of ['from', 'to']) { const ll = parseCoords(q.get(k)); if (ll) out.push(withId({ ll, text: '' })); }
  }
  return out.slice(0, MAX_STOPS);
}
function saveToUrl(stops) {
  const q = new URLSearchParams();
  for (const s of stops) q.append('s', `${s.ll.lat.toFixed(6)},${s.ll.lng.toFixed(6)}${s.text ? ',' + s.text : ''}`);
  history.replaceState(null, '', location.pathname + (stops.length ? '?' + q.toString() : ''));
}

function planHint(n) {
  if (n === 0) return 'Search or click the map to add your first stop.';
  if (n === 1) return 'Add another stop to make a route.';
  return 'Add more stops, or press Start route.';
}

export function App() {
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState({ msg: 'Loading Google Maps…', err: false });
  const [mode, setMode] = useState('plan');
  const [stops, setStops] = useState(stopsFromUrl);
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState({ idx: 0, playing: false, imagery: null });
  const [speed, setSpeed] = useState(SPEED_DEFAULT);

  const player = useMemo(() => new Player(setView), []);
  const say = (msg, err = false) => setNotice(msg ? { msg, err } : null);

  useEffect(() => {
    loadMaps(GMAPS_KEY, {
      onAuthFailure: () => say('Google Maps is unavailable right now (API key rejected or over quota). Please try again later.', true),
    }).then(() => { setReady(true); say(null); }, (e) => say(e.message, true));
  }, []);

  useEffect(() => { player.setOptions({ speed }); }, [speed]);
  useEffect(() => { if (mode === 'plan') saveToUrl(stops); }, [stops, mode]);

  // Keyboard: space = play/pause, arrows = step, shift+arrows = prev/next turn
  // (drive mode, not while typing).
  useEffect(() => {
    if (mode !== 'drive') return undefined;
    const onKey = (e) => {
      const t = e.target;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.tagName.startsWith('GMP-')) return;
      if (e.key === ' ') { e.preventDefault(); player.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? player.nextTurn() : player.step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? player.prevTurn() : player.step(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode]);

  async function start() {
    if (stops.length < 2) return;
    setBusy(true);
    say('Finding route…');
    try {
      const r = await buildRoute(stops);
      setRoute(r);
      setMode('drive');
      say(`${fmtDist(r.total)}, ${r.turns.length} turns. Click Street View or press → to step, shift+arrows for turns.`);
    } catch (e) {
      say(e.message || String(e), true);
    } finally {
      setBusy(false);
    }
  }

  // Ends the drive and goes back to planning with the same stops, ready to edit.
  function stop() {
    player.pause();
    setRoute(null);
    setMode('plan');
    say(null);
  }

  const edit = (f) => { setStops(f); say(null); };
  const addStop = (s) => edit((xs) => (xs.length < MAX_STOPS ? [...xs, withId(s)] : xs));
  const moveStop = (k, ll) => edit((xs) => xs.map((s, j) => (j === k ? { ...s, text: '', ll } : s)));
  const reorderStop = (from, to) => edit((xs) => { const ys = xs.slice(); ys.splice(to, 0, ys.splice(from, 1)[0]); return ys; });
  const removeStop = (k) => edit((xs) => xs.filter((_, j) => j !== k));

  const driving = mode === 'drive' && !!route;
  const nextTurn = driving ? route.turns.findIndex((t) => t.d > route.samples[view.idx].d + 2) : -1;
  const arrived = driving && view.idx === route.samples.length - 1 && !view.playing;
  const status = arrived ? { msg: 'Arrived. Press Play to run it again.' }
    : notice || { msg: mode === 'plan' ? planHint(stops.length) : '' };

  return html`
    <div class=${'app ' + mode}>
      <main>
        ${ready
          ? html`<${MapView} mode=${mode} stops=${stops} route=${route} idx=${view.idx}
              car=${driving ? route.samples[view.idx] : null} nextTurn=${nextTurn}
              onAdd=${addStop} onMove=${moveStop} onRemove=${removeStop} onReorder=${reorderStop}
              onJump=${(i) => player.jump(i)} onNotice=${say} />`
          : html`<div class="map-wrap"></div>`}
        <${DriveView} player=${player} route=${route} mode=${mode} view=${view} />
      </main>
      <${ControlBar} player=${player} route=${driving ? route : null} view=${view} speed=${speed} onSpeed=${setSpeed}
        status=${status} canRoute=${ready && stops.length >= 2} busy=${busy} onRoute=${start} onStop=${stop} />
    </div>`;
}
