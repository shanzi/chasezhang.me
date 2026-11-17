// Top-level state. Two modes:
//   plan  – full-size map; pick start/end by clicking, searching or typing.
//   drive – Street View plays the route, map shrinks to the side.
import { html, useEffect, useMemo, useState } from '../vendor/preact-htm.js';
import { GMAPS_KEY } from '../config.js';
import { loadMaps } from '../maps/loader.js';
import { buildRoute } from '../maps/routing.js';
import { fmtCoords, fmtDist, parseCoords } from '../maps/geo.js';
import { Player } from '../player.js';
import { RouteBar } from './RouteBar.js';
import { MapView } from './MapView.js';
import { DriveView } from './DriveView.js';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
};

// A point is what the user sees ({text}) plus, when known, exact coordinates ({ll}).
const point = (text) => ({ text: text || '', ll: parseCoords(text) });
const routeInput = (p) => p.ll || p.text.trim();
const parseVia = (s) => s.split(';').map((x) => x.trim()).filter(Boolean).map((x) => parseCoords(x) || x);

function planHint(from, to) {
  const f = !!from.text.trim(), t = !!to.text.trim();
  if (!f && !t) return 'Search or click the map to choose a start point.';
  if (!f) return 'Now choose the start point.';
  if (!t) return 'Now choose the destination.';
  return 'Ready. Press Start route to drive it in Street View.';
}

function saveToUrl(from, to, via) {
  const q = new URLSearchParams();
  q.set('from', from.ll ? fmtCoords(from.ll) : from.text.trim());
  q.set('to', to.ll ? fmtCoords(to.ll) : to.text.trim());
  if (via.trim()) q.set('via', via.trim());
  history.replaceState(null, '', location.pathname + '?' + q.toString());
}

export function App() {
  const params = new URLSearchParams(location.search);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState({ msg: 'Loading Google Maps…', err: false });
  const [mode, setMode] = useState('plan');
  const [from, setFrom] = useState(() => point(params.get('from')));
  const [to, setTo] = useState(() => point(params.get('to')));
  const [via, setVia] = useState(() => params.get('via') || '');
  const [spacing, setSpacing] = useState(15);
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState({ idx: 0, playing: false, imagery: null });
  const [units, setUnits] = useState(() => store.get('rr_units') || 'km');
  const [speed, setSpeed] = useState(2);
  const [slowTurns, setSlowTurns] = useState(true);

  const player = useMemo(() => new Player(setView), []);
  const say = (msg, err = false) => setNotice(msg ? { msg, err } : null);

  useEffect(() => {
    loadMaps(GMAPS_KEY, {
      onAuthFailure: () => say('Google Maps is unavailable right now (API key rejected or over quota). Please try again later.', true),
    }).then(() => { setReady(true); say(null); }, (e) => say(e.message, true));
  }, []);

  useEffect(() => { player.setOptions({ speed, slowTurns }); }, [speed, slowTurns]);
  useEffect(() => { store.set('rr_units', units); }, [units]);

  // Keyboard: space = play/pause, arrows = step (drive mode, not while typing).
  useEffect(() => {
    if (mode !== 'drive') return undefined;
    const onKey = (e) => {
      const t = e.target;
      if ((/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && t.type !== 'range') || t.tagName.startsWith('GMP-')) return;
      if (e.key === ' ') { e.preventDefault(); player.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); player.step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); player.step(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode]);

  async function start() {
    if (!from.text.trim() || !to.text.trim()) { say('Choose both a start and a destination.', true); return; }
    setBusy(true);
    say('Finding route…');
    try {
      const r = await buildRoute({ from: routeInput(from), to: routeInput(to), via: parseVia(via), spacing });
      setRoute(r);
      setMode('drive');
      saveToUrl(from, to, via);
      say(`Route: ${fmtDist(r.total, units)}, ${r.steps.length} instructions. Space pauses, ← → step, click the map to jump.`);
    } catch (e) {
      say(e.message || String(e), true);
    } finally {
      setBusy(false);
    }
  }

  const setPoint = (which, p) => { (which === 'from' ? setFrom : setTo)(p); say(null); };
  const onField = (key, value) => {
    if (key === 'via') setVia(value); else setPoint(key, point(value));
  };

  const nextTurn = mode === 'drive' && route
    ? route.steps.findIndex((s) => s.d > route.samples[view.idx].d + 2) : -1;
  const arrived = mode === 'drive' && route && view.idx === route.samples.length - 1 && !view.playing;
  const status = arrived ? { msg: 'Arrived. Press Play to run it again.' }
    : notice || { msg: mode === 'plan' ? planHint(from, to) : '' };

  return html`
    <div class=${'app ' + mode}>
      <${RouteBar} from=${from} to=${to} via=${via} spacing=${spacing} mode=${mode} busy=${busy} ready=${ready}
        onField=${onField} onSpacing=${setSpacing} onStart=${start}
        onEdit=${() => { setMode('plan'); say(null); }} />
      <main>
        <${DriveView} player=${player} route=${route} mode=${mode} view=${view}
          units=${units} speed=${speed} slowTurns=${slowTurns}
          onUnits=${setUnits} onSpeed=${setSpeed} onSlowTurns=${setSlowTurns} />
        ${ready
          ? html`<${MapView} mode=${mode} from=${from} to=${to} route=${route}
              car=${mode === 'drive' && route ? route.samples[view.idx] : null} nextTurn=${nextTurn}
              onPick=${setPoint} onJump=${(i) => player.jump(i)} onNotice=${say} />`
          : html`<div class="map"></div>`}
      </main>
      <div class=${'status' + (status.err ? ' err' : '')} role="status">${status.msg}</div>
    </div>`;
}
