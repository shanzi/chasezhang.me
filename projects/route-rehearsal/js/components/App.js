// Top-level state. Two modes:
//   plan  – full-size map; pick start/end by clicking, searching or typing.
//   drive – Street View plays the route, map shrinks to the side.
import { html, useEffect, useMemo, useState } from '../vendor/preact-htm.js';
import { GMAPS_KEY, SPEED_DEFAULT } from '../config.js';
import { loadMaps } from '../maps/loader.js';
import { buildRoute } from '../maps/routing.js';
import { fmtCoords, fmtDist, parseCoords } from '../maps/geo.js';
import { Player } from '../player.js';
import { RouteBar } from './RouteBar.js';
import { MapView } from './MapView.js';
import { DriveView } from './DriveView.js';

// A point is what the user sees ({text}) plus, when known, exact coordinates ({ll}).
const point = (text) => ({ text: text || '', ll: parseCoords(text) });
const routeInput = (p) => p.ll || p.text.trim();

function planHint(from, to) {
  const f = !!from.text.trim(), t = !!to.text.trim();
  if (!f && !t) return 'Search or click the map to choose a start point.';
  if (!f) return 'Now choose the start point.';
  if (!t) return 'Now choose the destination.';
  return 'Ready. Press Start route to drive it in Street View.';
}

function saveToUrl(from, to) {
  const q = new URLSearchParams();
  q.set('from', from.ll ? fmtCoords(from.ll) : from.text.trim());
  q.set('to', to.ll ? fmtCoords(to.ll) : to.text.trim());
  history.replaceState(null, '', location.pathname + '?' + q.toString());
}

export function App() {
  const params = new URLSearchParams(location.search);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState({ msg: 'Loading Google Maps…', err: false });
  const [mode, setMode] = useState('plan');
  const [from, setFrom] = useState(() => point(params.get('from')));
  const [to, setTo] = useState(() => point(params.get('to')));
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

  // Keyboard: space = play/pause, arrows = step, shift+arrows = prev/next turn
  // (drive mode, not while typing).
  useEffect(() => {
    if (mode !== 'drive') return undefined;
    const onKey = (e) => {
      const t = e.target;
      // Ignore keys meant for form controls (the route scrubber is fine: arrows step there too).
      if ((/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && !t.classList.contains('scrub')) || t.tagName.startsWith('GMP-')) return;
      if (e.key === ' ') { e.preventDefault(); player.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? player.nextTurn() : player.step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? player.prevTurn() : player.step(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode]);

  async function start() {
    if (!from.text.trim() || !to.text.trim()) { say('Choose both a start and a destination.', true); return; }
    setBusy(true);
    say('Finding route…');
    try {
      const r = await buildRoute({ from: routeInput(from), to: routeInput(to) });
      setRoute(r);
      setMode('drive');
      saveToUrl(from, to);
      say(`Route: ${fmtDist(r.total)}, ${r.turns.length} turns. Click Street View or press → to step, shift+← / → for turns, space to play/pause.`);
    } catch (e) {
      say(e.message || String(e), true);
    } finally {
      setBusy(false);
    }
  }

  const setPoint = (which, p) => { (which === 'from' ? setFrom : setTo)(p); say(null); };
  const onField = (key, value) => setPoint(key, point(value));

  const nextTurn = mode === 'drive' && route
    ? route.turns.findIndex((t) => t.d > route.samples[view.idx].d + 2) : -1;
  const arrived = mode === 'drive' && route && view.idx === route.samples.length - 1 && !view.playing;
  const status = arrived ? { msg: 'Arrived. Press Play to run it again.' }
    : notice || { msg: mode === 'plan' ? planHint(from, to) : '' };

  return html`
    <div class=${'app ' + mode}>
      <${RouteBar} from=${from} to=${to} mode=${mode} busy=${busy} ready=${ready}
        onField=${onField} onStart=${start}
        onEdit=${() => { setMode('plan'); say(null); }} />
      <main>
        <${DriveView} player=${player} route=${route} mode=${mode} view=${view}
          speed=${speed} onSpeed=${setSpeed} />
        ${ready
          ? html`<${MapView} mode=${mode} from=${from} to=${to} route=${route}
              car=${mode === 'drive' && route ? route.samples[view.idx] : null} nextTurn=${nextTurn}
              onPick=${setPoint} onJump=${(i) => player.jump(i)} onNotice=${say} />`
          : html`<div class="map"></div>`}
      </main>
      <div class=${'status' + (status.err ? ' err' : '')} role="status">${status.msg}</div>
    </div>`;
}
